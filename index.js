class APIService {
  constructor(baseUrl, el) {
    this.baseUrl = baseUrl
    this.loadingEl = el
  }

  setLoading(boolean) {
    if (boolean) {
      this.loadingEl.classList.add('active')
    } else {
      this.loadingEl.classList.remove('active')
    }
  }

  async fetchData() {
    try {
      this.setLoading(true)
      const resp = await fetch(this.baseUrl)
      return resp.json()
    } catch (e) {
      console.error('Error while fetch data ', e)
    } finally {
      this.setLoading(false)
    }
  }

  async updateData(id, body) {
    try {
      this.setLoading(true)
      await fetch(`${this.baseUrl}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })
    } catch (e) {
      console.error('Error while update data', e)
    } finally {
      this.setLoading(false)
    }
  }

  async deleteData(id) {
    try {
      this.setLoading(true)
      await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (e) {
      console.error('Error while delete data', e)
    } finally {
      this.setLoading(false)
    }
  }

  async addData(body) {
    try {
      this.setLoading(true)
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body,
      })
      return response.json()
    } catch (e) {
      console.error('Error while add data', e)
    } finally {
      this.setLoading(false)
    }
  }
}

class Table {
  constructor(tbodySelector, apiService) {
    this.apiService = apiService
    this.tbody = tbodySelector
    this.data = []
    this.modalEdit = null
    this.modalCreate = null
    this.searchRow = null
    this.inputRef = null
    this.filterState = {
      value: '',
      type: '',
    }
  }

  async init() {
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

    if (this.data.length < 1)
      this.tbody.appendChild = `<td colspan="100%" class="alert">This user was not found</td>`

    for (const user of this.data) {
      this.tbody.insertAdjacentHTML('beforeend', this.createRow(user))
    }
  }

  createRow(user) {
    return `
      <tr>
        <td>${user.id}</td>
        ${this.createCell(user.name, user.id, 'name')}
        ${this.createCell(user.surname, user.id, 'surname')}
        ${this.createCell(user.patronym, user.id, 'patronym')}
      </tr>
    `
  }

  createCell(value, id, type) {
    return `
      <td data-id="${id}" class="${type}">${value}</td>
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
      this.searchRow.insertAdjacentHTML(
        'beforeend',
        `
        <td>
          <div class="search-field">
            <img class="icon" src="./icons/search.svg" alt="search">
            <input value="${
              isActive ? this.filterState.value : ''
            }" data-type="${types[i]}"  type="search">
          </div>
        </td>
        <td></td>
        <td></td>
      `
      )
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
        this.handleCreate()
      }
    })
  }

  async handleDelete(id, type, el) {
    if (el.textContent !== '') {
      const fields = document.querySelectorAll(`[data-id="${id}"]`)
      const isEmptyFields = Array.from(fields).filter(
        (field) => field.textContent === ''
      ).length

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

  async deleteField(id, type, el) {
    if (window.confirm(`Are you sure to delete the ${type}`)) {
      const body = JSON.stringify({ [type]: '' })
      await this.apiService.updateData(id, body)
      el.textContent = ''
    }
  }

  handleEdit(id, type, el) {
    const value = el.textContent
    if (!this.modalEdit) {
      this.modalEdit = new ModalEdit({
        nameValue: value,
        textBtn: 'change',
        title: `Edit ${type}`,
      })
    } else {
      this.modalEdit.nameValue = value
      this.modalEdit.textBtn = 'change'
      this.modalEdit.title = `Edit ${type}`
    }

    this.modalEdit.open()

    const form = this.modalEdit.modalEl.querySelector('form')
    form.onsubmit = async (e) => {
      e.preventDefault()
      const inputValue = this.modalEdit.modalEl.querySelector('input').value
      if (inputValue === value) {
        this.modalEdit.close()
      } else {
        const body = JSON.stringify({ [type]: inputValue })
        console.log(body)
        await this.apiService.updateData(id, body)
        el.textContent = inputValue
        this.modalEdit.close()
      }
    }
  }

  handleCreate() {
    if (!this.modalCreate) {
      this.modalCreate = new ModalCreate({
        textBtn: 'create',
        title: 'Create user'
      })
    }
    this.modalCreate.open()
    this.submitHandler(this.modalCreate)
  }

  async removeItem(id) {
    await this.apiService.deleteData(id)
    await this.loadData()
    this.renderTable()
  }

  async searchField(el) {
    this.filterState.type = el.dataset.type
    this.filterState.value = el.value
    const filteredData = this.data.filter((user) => {
      return user[this.filterState.type].toLowerCase().includes(this.filterState.value.toLowerCase())
    }
    )

    if (this.filterState.value.length > 0) {
      this.data = filteredData
    } else {
      await this.loadData()
    }
    this.renderTable()
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

  removeSubmitListener(form) {
    const newForm = form.cloneNode(true)
    form.parentNode.replaceChild(newForm, form)
    return newForm
  }

  submitHandler(obj) {
    let form = obj.modalEl.querySelector('form')
    form = this.removeSubmitListener(form)
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const inputs = form.querySelectorAll('input')
      const body = this.getBody(inputs)
      if (body) {
        await this.apiService.addData(JSON.stringify(body))
        await this.loadData()
        this.renderTable()
        obj.close()
      }
    })
  }
}

class Modal {
  constructor(obj) {
    this.textBtn = obj.textBtn || 'submit'
    this.title = obj.title || `Modal`

    this.modalEl = null

    this.createModal()
    this.eventListener()
  }

  createModal() {
    this.modalEl = document.createElement('div')
    this.modalEl.classList.add('modal')

    this.modalEl.insertAdjacentHTML(
      'beforeend',
      `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h4>${this.title}</h4>
        <form>
          ${this.getFields()}
          <button class="modal-button" type="submit">${this.textBtn}</button>
        </form>
      </div>
    `
    )

    document.body.appendChild(this.modalEl)
  }

  getFields() {
    return `<input required type="text" />`
  }

  eventListener() {
    this.modalEl.onclick = (e) => {
      if (!e.target.closest('.modal-content') || e.target.closest('span')) {
        this.close()
      }
    }
  }

  open() {
    this.modalEl.classList.add('open')
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.remove('open')
    }
  }
}

class ModalEdit extends Modal {
  constructor(obj) {
    super(obj)
    this.nameValue = obj.nameValue
  }

  updateModal() {
    const modalContent = this.modalEl.querySelector('.modal-content')
    modalContent.querySelector('h4').textContent = this.title
    this.updateFields(modalContent)
  }

  updateFields(modalContent) {
    modalContent.querySelector('input').value = this.nameValue
  }

  getFields() {
    return `<input required value="${this.nameValue}" type="text" />`
  }

  open() {
    this.updateModal()
    this.modalEl.classList.add('open')
  }
}

class ModalCreate extends Modal {
  constructor(obj) {
    super(obj)
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
}

const apiService = new APIService(
  'https://a4d8296abac85262.mokky.dev/table',
  document.querySelector('.loading')
)
const table = new Table(document.querySelector('tbody'), apiService)

table.init()


