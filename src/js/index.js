const PRODUCTS_ON_PAGE = 10;
let currentState = ''; // json response from fetching products
let totalPages = 0; // total pages of products after request
let lastWrongRequest = ''; // last typed in string led to 404 response
const catalogArea = document.querySelector('.products');
const searchLine = document.querySelector('.searchLine');
const paginationArea = document.querySelector('.pagination');
const requestParams = {
  'search': '',
  'sortField': 'price',
  'sortDirection': 'asc',
  'page': 1
};

const noProductsNotify = function () {
  catalogArea.innerText = 'По Вашему запросу товаров не найдено';
};

const Pagination = {
  code: '',

  Extend(data) {
    data = data || {};
    Pagination.size = data.size || 10;
    Pagination.page = data.page || 1;
    Pagination.step = data.step || 3;
  },

  Add(start, total) {
    for (let i = start; i < total; i++) {
      Pagination.code += `<a class="pagination__item" data-page="${i}">` + i + '</a>';
    }
  },

  // last page with separator
  Last() {
    Pagination.code += `<i>...</i><a class="pagination__item" data-page="${Pagination.size}">` + Pagination.size + '</a>';
  },

  // first page with separator
  First() {
    Pagination.code += '<a class="pagination__item" data-page="1">1</a><i>...</i>';
  },

  // changing page
  Click() {
    Pagination.page = +this.dataset.page;
    Pagination.Start();
  },

  // previous page
  Prev() {
    Pagination.page--;

    if (Pagination.page < 1) {
      Pagination.page = 1;
    }

    Pagination.Start();
  },

  // next page
  Next() {
    Pagination.page++;

    if (Pagination.page > Pagination.size) {
      Pagination.page = Pagination.size;
    }

    Pagination.Start();
  },

  // binding pages
  Bind() {
    let items = Pagination.container.querySelectorAll('.pagination__item');
    for (let i = 0; i < items.length; i++) {
      if (+items[i].dataset.page === Pagination.page) items[i].classList.add('current');
      items[i].addEventListener('click', function () {
        if(!this.classList.contains('current')) {
          Pagination.Click.call(this);
          requestParams.page = +this.dataset.page;
          fillCatalog(true);
        }
      }, false);
    }
  },

  // write pagination
  Finish() {
    Pagination.container.innerHTML = Pagination.code;
    Pagination.code = '';
    Pagination.Bind();
  },

  Start() {
    if (Pagination.size < Pagination.step * 2 + 6) {
      Pagination.Add(1, Pagination.size + 1);
    }
    else if (Pagination.page < Pagination.step * 2 + 1) {
      Pagination.Add(1, Pagination.step * 2 + 4);
      Pagination.Last();
    }
    else if (Pagination.page > Pagination.size - Pagination.step * 2) {
      Pagination.First(Pagination.size, Pagination.step);
      Pagination.Add(Pagination.size - Pagination.step * 2 - 2, Pagination.size + 1);
    }
    else {
      Pagination.First();
      Pagination.Add(Pagination.page - Pagination.step, Pagination.page + Pagination.step + 1);
      Pagination.Last();
    }
    Pagination.Finish();
  },

  // binding buttons
  Buttons(elem) {
    elem.querySelector('[data-pagination="back"]').addEventListener('click', function() {
      if(requestParams.page > 1) {
        Pagination.Prev();
        requestParams.page = Math.max(1, requestParams.page - 1);
        if(requestParams.page + 1 !== 1) {
          fillCatalog(true);
        }
      }

    }, false);
    elem.querySelector('[data-pagination="forward"]').addEventListener('click', function() {
      if(requestParams.page < Pagination.size) {
        Pagination.Next();
        requestParams.page = Math.min(requestParams.page + 1, Pagination.size);
        if(requestParams.page - 1 !== Pagination.size) {
          fillCatalog(true);
        }
      }
    }, false);
  },

  // create pagination at 'elem' HTML-element
  Create(element) {
    const html = [
      `<a class="pagination__control" data-pagination="back">Назад</a>`,
      '<div class="pagination__container"></div>',
      `<a class="pagination__control" data-pagination="forward">Вперед</a>`];
    element.innerHTML = html.join('');
    Pagination.container = element.querySelector('.pagination__container');
    Pagination.Buttons(element);
  },

  Init(element, size) {
    Pagination.Extend({size: size});
    Pagination.Create(element);
    Pagination.Start();
  },

  Remove(element) {
    element.innerHTML = '';
  }
};

// toggles class 'className' at element with 'selector' selector
const toggleClassName = function (element, className) {
  try {
    if (element.classList.contains(className)) {
      element.classList.remove(className);
    } else {
      element.classList.add(className);
    }
  } catch (e) {
    throw new Error('There is no element with such selector');
  }
};

// check pressed button's code is 'deleting'
const deleteBtnCode = (code) => code === 8 || code === 46;

// toggles dropdown with data-dropdown_list='target' attribute if it's closed and vice versa
const toggleDropdown = function (target) {
  try {
    const listToToggle = document.querySelector(`[data-dropdown_list='${target}']`);
    toggleClassName(listToToggle, 'opened');
  } catch (e) {
    throw new Error('HTML element must have proper data-target attribute');
  }
};0

// closes dropdown with data-dropdown_list='target' attribute
const closeDropDown = function (target) {
  try {
    const listToClose = document.querySelector(`[data-dropdown_list='${target}']`);
    listToClose.classList.remove('opened');
  } catch (e) {
    throw new Error('HTML element must have proper data-target attribute');
  }
};

// closes all dropdown on the page
const closeAllDropdowns = function () {
  document.querySelectorAll('[data-dropdown_list]').forEach(function (el) {
    el.classList.remove('opened');
  });
};

// fill dropdown's 'header' which 'element' relates to with proper text
const fillDropdownHeader = function (element) {
  const dropdownHeader = element.closest(`[data-items='sorting']`).querySelector(`[data-action='dropdown_open'] span`);
  dropdownHeader.innerText = element.innerText;
};

// adds class with 'className' (string) to 'element' (HTML-element)
// and removes class with 'className'
// from all elements that fit to 'selector' (string)
const addUniqClassName = function (element, className, selector) {
  const allElements = document.querySelectorAll(selector);
  allElements.forEach(function (el) {
    el.classList.remove(className);
  });
  element.classList.add(className);
};

class Product {
  constructor(name, img, price) {
    this.name = name;
    this.img = img;
    this.price = price;
  }

  createHTML(className) {
    const product = document.createElement('div');
    product.classList.add(className);
    const img = document.createElement('img');
    img.classList.add(className + '__img');
    img.src = this.img;
    const name = document.createElement('div');
    name.classList.add(className + '__name');
    name.innerText = this.name;
    const price = document.createElement('div');
    price.classList.add(className + '__price');
    price.innerText = this.price + ' руб.';
    const info = document.createElement('div');
    info.classList.add(className + '__info');
    info.appendChild(name);
    info.appendChild(price);
    product.appendChild(img);
    product.appendChild(info);
    this.product = product;
    return product;
  }

  addTo(element) {
    element.appendChild(this.product);
  }

}

// takes params for request (see const requestParams' structure) as object
// returns json with catalog's info
const getCatalogInfo = async params => {
  const entryPoint = `https://www.lenvendo.ru/api/js-test-task/?`;
  const paramsString = '' + (params.search ? `search=${params.search}&` : '') + (params.sortField ? `sort_field=${params.sortField}&` : '') + (params.sortDirection ? `sort_direction=${params.sortDirection}&` : '') + (params.page ? `page=${params.page}` : '');
  const requestString = entryPoint + paramsString;

  try {
    const response = await fetch(requestString);
    if (!response.ok) {
      noProductsNotify();
      lastWrongRequest = searchLine.value;
      paginationArea.innerHTML = ""; // ????? doesn't work
      paginationArea.classList.add('hidden');
    }

    const responseJson = await response.json();
    currentState = responseJson;
    return responseJson;
  } catch (e) {
    console.log(e);
  }
};

// takes array of products
// creates HTML for every product in 'productsArray' and adds it to 'element'
const addProductsToPage = function (productsArray, element) {
  element.innerHTML = '';

  for (let i = 0; i < productsArray.length; i++) {
    const {
      name,
      image,
      price
    } = productsArray[i];
    const product = new Product(name, image, price);
    product.createHTML('product');
    product.addTo(element);
  }
};

// changes the order of products flow from last to first
const reverseCatalog = function () {
  for (let i = 1; i < catalogArea.childNodes.length; i++) {
    catalogArea.insertBefore(catalogArea.childNodes[i], catalogArea.firstChild);
  }
};

// fills catalog area with products due to current requestParams variable
const fillCatalog = function(update = false) {
  console.log('filling')
  document.querySelector('.spinner').classList.remove('hidden');
  getCatalogInfo(requestParams).then(data => {
    if (data.products && data.products.length) {
      addProductsToPage(data.products, catalogArea);
      const currentPage = +data.current_page;
      totalPages = Math.ceil(data.total_count / PRODUCTS_ON_PAGE);
      if(data.total_count < PRODUCTS_ON_PAGE) {
        paginationArea.classList.add('hidden');
      }
    }

    document.querySelector('.spinner').classList.add('hidden');
    if(!update) {
      Pagination.Init(paginationArea, totalPages)
    }
  });
};

// click on dropdown list 'header' => open / close proper dropdown list
document.querySelectorAll(`[data-action='dropdown_open']`).forEach(function (el) {
  el.addEventListener('click', function toggleDropDownList(e) {
    if (this.contains(e.target)) {
      toggleDropdown(this.dataset.dropdown_target);
    } else {
      closeDropDown(this.dataset.dropdown_target);
    }
  });
});

// click on sorting list's item => sort products
document.querySelectorAll(`[data-action='sort']`).forEach(function (el) {
  el.addEventListener('click', function sortProducts() {
    fillDropdownHeader(this);
    closeAllDropdowns();
    addUniqClassName(this, 'hidden', `[data-action='sort']`);
    const sortField = this.dataset.sort_by;
    const sortDirection = this.dataset.sort_direction;
    // reset request page to start
    requestParams.page = 1;
    // if products total count <= products on page =>
    // reverse order of products without request
    if (currentState.total_count <= PRODUCTS_ON_PAGE && requestParams.sortField === sortField) {
      requestParams.sortDirection = sortDirection;
      reverseCatalog();
    } else {
      requestParams.sortField = sortField;
      requestParams.sortDirection = sortDirection;
      fillCatalog();
    }
  });
});

// click on 'changing catalog's view icon => change catalog view
document.querySelectorAll(`[data-action='change_catalog_view']`).forEach(function (el) {
  el.addEventListener('click', function changeCatalogView() {
    const catalogView = this.dataset.catalog_view;
    catalogArea.setAttribute('data-view', catalogView);
    addUniqClassName(this, 'view__item--active', `[data-action='change_catalog_view']`);
  });
});

// type in char in search line => search
document.querySelector(`[data-action='search']`).addEventListener('keyup', function search(e) {
  if(deleteBtnCode(e.key) && searchLine.value === "") {
    requestParams.search = "";
    fillCatalog();
  }

  if (!this.value.includes(lastWrongRequest) || lastWrongRequest === '') {
    requestParams.search = this.value;
    paginationArea.classList.remove('hidden');
    fillCatalog();
  }
});

// closes all dropdowns if click was out of dropdown
window.addEventListener('click', function closeDropdowns(e) {
  if (!e.target.closest('[data-dropdown_list]') && !e.target.closest('[data-dropdown_target]')) {
    closeAllDropdowns();
  }
});

fillCatalog();
Pagination.Init(paginationArea, totalPages)