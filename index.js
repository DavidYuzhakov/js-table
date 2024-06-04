class APIService {
  constructor (baseUrl) {
    this.baseUrl = baseUrl
  }

  async fetchData() {
    try {
      const resp = await fetch(this.baseUrl)
      return resp.json()
    } catch (e) {
      console.error('Error while fetch data ', e)
    }
  }

  async updateData(id, body) {
    try {
      await fetch(`${this.baseUrl}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      })
    } catch (e) {
      console.error('Error while update data', e)
    }
  }


  async deleteData(id) {
    try {
      await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (e) {
      console.error('Error while delete data', e)
    }
  }

  async addData (body) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-type': "text/plain"
        },
        body
      })
      return response.json()
      
    } catch (e) {
      console.error('Error while add data', e)
    }
  }
}

class Table {
  constructor (tbodySelector, apiService) {
    this.apiService = apiService
    this.tbody =  tbodySelector
    this.data = []
    this.modalEdit = null
    this.modalCreate = null
    this.searchRow = null
    this.inputRef = null
    this.filterState = {
      value: '',
      type: ''
    }
  }

  async init () {
    await this.loadData()
    this.renderTable()
    this.addTableEventListners()
  }

  async loadData() {
    this.data = await this.apiService.fetchData()
  }

  renderTable() {
    if (!this.data || !this.tbody) return 

    this.createSearchRow()

    if (this.data.length < 1) this.tbody.appendChild = `<td colspan="100%" class="alert">This user was not found</td>` 

    for (const user of this.data) {
      this.tbody.insertAdjacentHTML('beforeend', this.createRow(user))
    }
  }

  createRow(user) {
    return `
      <tr>
        <td>${ user.id }</td>
        ${this.createCell(user.name, user.id, 'name')}
        ${this.createCell(user.surname, user.id, 'surname')}
        ${this.createCell(user.patronym, user.id, 'patronym')}
      </tr>
    `
  }

  createCell(value, id, type) {
    return `
      <td data-id="${id}" class="${type}">${ value }</td>
      <td id="${id}" data-type="${type}" class="edit">✏️</td>
      <td id="${id}" data-type="${type}" class="delete">🗑️</td>
    `
  }

  createSearchRow() {
    this.tbody.innerHTML = `
      <tr class="search-row">
        <td></td>
      </tr>
    `
    
    const types = ['name', 'surname', 'patronym']
    this.searchRow = this.tbody.querySelector('.search-row')

    for (let i = 0; i < types.length; i++) {
      const isActive = this.filterState.type === types[i]
      this.searchRow.insertAdjacentHTML('beforeend', `
        <td>
          <div class="search-field">
            <img class="icon" src="./icons/search.svg" alt="search">
            <input value="${isActive ? this.filterState.value : ""}" data-type="${types[i]}"  type="search">
          </div>
        </td>
        <td></td>
        <td></td>
      `)
    } 
  }

  addTableEventListners() {
    document.body.addEventListener('click', async (e) => {
      const id = e.target.id
      const type = e.target.getAttribute('data-type')
      const targetCell = this.tbody.querySelector(`.${type}[data-id="${id}"]`)
  
      if (e.target.classList.contains('delete')) {
        await this.handleDelete(id, type, targetCell)
      } else if (e.target.classList.contains('edit')) {
        this.handleEdit(id, type, targetCell)
      } else if (e.target.classList.contains('icon')) {
        const input = e.target.nextElementSibling
        this.searchField(input)
      } else if (e.target.classList.contains('add-btn')) {
        this.createField()
      }
    })
  }
  
  async handleDelete (id, type, el) {
    if (el.textContent !== "") {
      const fields = document.querySelectorAll(`[data-id="${id}"]`)
      const isEmptyFields = Array.from(fields).filter(field => field.textContent === "").length

      if (isEmptyFields > 1) {
        if (window.confirm('Are you sure to full remove this item?')) {
          await this.removeItem(id)
        }
      } else {
        await this.deleteField(id, type, el)
      }
    } else {
      return alert('This field already has been cleared')
    }
      
  }

  async deleteField (id, type, el) {
    if (window.confirm(`Are you sure to delete the ${type}`)) {
      const body = JSON.stringify({ [type]: "" })
      await this.apiService.updateData(id, body)
      el.textContent = ''
    }
  }

  handleEdit (id, type, el) {
    const value = el.textContent
    if (!this.modalEdit) {
      this.modalEdit = new Modal({ 
        nameValue: value,
        textBtn: 'change',
        title: `Edit ${type}`
      })
    } else {
      this.modalEdit.nameValue = value
      this.modalEdit.textBtn = 'change'
      this.modalEdit.title = `Edit ${type}`
    }

    this.modalEdit.open()

    const btn = this.modalEdit.modal.querySelector('button')
    btn.onclick = async () => {
      const inputValue = this.modalEdit.modal.querySelector('input').value
      const body = JSON.stringify({ [type]: inputValue })
      await this.apiService.updateData(id, body)
      el.textContent = inputValue
      this.modalEdit.close()
    }
  }

  async removeItem(id) {
    await this.apiService.deleteData(id)
    await this.loadData()
    this.renderTable()
  }

  async searchField(el) {
    this.filterState.type = el.dataset.type
    this.filterState.value = el.value
    const filteredData = this.data.filter(user => user[this.filterState.type].toLowerCase().includes(this.filterState.value.toLowerCase()))
    
    if (this.filterState.value.length > 0 ) {
      this.data = filteredData
    } else {
      await this.loadData()
    }
    this.renderTable()
  } 

  createField () {
    if (!this.modalCreate) {
      this.modalCreate = new CreateModal({
        title: 'Create user',
        textBtn: 'create'
      })
    } else {
      this.modalCreate.title = 'Create user'
      this.modalCreate.textBtn = 'create'
    }

    this.modalCreate.open()
    this.submitHandler(this.modalCreate)
  }

  getBody (inputs) {
    const body = {}
    let error = 0

    inputs.forEach(input => {
      error = 0
      const span = input.previousElementSibling
      span.classList.remove('active')

      body[input.name] = input.value
      if (input.value.length < input.min) {
        error++
        span.classList.add('active')
      }
    })

    if (error === 0) {
      return body
    }
  }

  submitHandler(obj) {
    const form = obj.modal.querySelector('form')
    form.addEventListener('submit', (e) => {
      e.preventDefault()      
      const inputs = e.target.querySelectorAll('input')
      const body = this.getBody(inputs)
      console.log(body)
    })
  }
}

class Modal {
  constructor (obj) {
    this.nameValue = obj.nameValue
    this.textBtn = obj.textBtn || 'submit'
    this.title = obj.title || `Modal`

    this.modal = null

    this.createModal()
    this.eventListener()
  }

  createModal() {
    this.modal = document.createElement('div')
    this.modal.classList.add('modal')
    
    this.modal.insertAdjacentHTML('beforeend', `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h4>${this.title}</h4>
        <form>
          ${this.getFields()}
          <button class="modal-button" type="submit">${this.textBtn}</button>
        </form>
      </div>
    `)

    document.body.appendChild(this.modal)
  }

  getFields() {
    return `<input required value="${this.nameValue}" type="text" />`
  }

  updateModal() {
    const modalContent = this.modal.querySelector('.modal-content')
    modalContent.querySelector('h4').textContent = this.title
    this.updateFields(modalContent)
  }

  updateFields(modalContent) {
    modalContent.querySelector('input').value = this.nameValue
  }

  eventListener () {
    this.modal.onclick = e => {
      if (!e.target.closest('.modal-content') || e.target.closest('span')) {
        this.close()
      }
    }
  }

  open() {
    this.updateModal()
    this.modal.classList.add('open')    
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('open')
    }
  }
}

class CreateModal extends Modal {
  constructor (params) {
    super(params)
  }

  getFields() {
    return `
      <label>
        Name <span>(min 3)</span>: 
        <input name="name" type="text" min="3" required />
      </label>
      <label>
        Surname <span>(min 6)</span>: 
        <input name="surname" type="text" min="6" required />
      </label>
      <label>
        Patronym <span>(min 7)</span>: 
        <input name="patronym" type="text" min="7" required />
      </label>
    `
  }

  updateFields () {}
}

const apiService = new APIService('https://a4d8296abac85262.mokky.dev/table')
const table = new Table(document.querySelector('tbody'), apiService)

table.init()
  

/* getBody (inputs) {
  const body = {}

  inputs.forEach(input => {
    const span = input.previousElementSibling
    span.classList.remove('active')

    body[input.name] = input.value
    if (input.value.length < input.min) {
      span.classList.add('active')
      return
    }
  })

  return body
} */