'use strict';



// element toggle function
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }



// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// sidebar toggle functionality for mobile
sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });



// custom select variables
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");

select.addEventListener("click", function () { elementToggleFunc(this); });

// add event in all select items
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {

    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);
    syncFilterBtn(selectedValue);

  });
}

// keep the desktop filter buttons in sync with the mobile dropdown
const syncFilterBtn = function (selectedValue) {

  for (let i = 0; i < filterBtn.length; i++) {
    const isMatch = filterBtn[i].innerText.toLowerCase() === selectedValue;
    filterBtn[i].classList.toggle("active", isMatch);
    if (isMatch) lastClickedBtn = filterBtn[i];
  }

}

// filter variables
const filterItems = document.querySelectorAll("[data-filter-item]");

// a project can belong to several categories: data-category="app development, machine learning"
const filterFunc = function (selectedValue) {

  for (let i = 0; i < filterItems.length; i++) {

    const categories = (filterItems[i].dataset.category || "")
      .split(",")
      .map(function (c) { return c.trim().toLowerCase(); });

    const isMatch = selectedValue === "all" || categories.includes(selectedValue);
    filterItems[i].classList.toggle("active", isMatch);

  }

}

// add event in all filter button items for large screen
let lastClickedBtn = filterBtn[0];

for (let i = 0; i < filterBtn.length; i++) {

  filterBtn[i].addEventListener("click", function () {

    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;

  });

}



// contact form variables
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");
const formStatus = document.querySelector("[data-form-status]");

// add event to all form input field
for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {

    // check form validation
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }

  });
}

if (form) {
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!formBtn || !formStatus) {
      form.submit();
      return;
    }

    formBtn.setAttribute("disabled", "");
    formStatus.textContent = "Sending...";
    formStatus.classList.remove("success", "error");

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
        headers: { Accept: "application/json" }
      });
      const data = await response.json();

      if (response.ok && data.success) {
        form.reset();
        formBtn.setAttribute("disabled", "");
        formStatus.textContent = "Message sent successfully!";
        formStatus.classList.add("success");
      } else {
        throw new Error(data.message || "Form submission failed.");
      }
    } catch (error) {
      formStatus.textContent = "Something went wrong. Please try again.";
      formStatus.classList.add("error");
      formBtn.removeAttribute("disabled");
    }
  });
}



// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// add event to all nav link
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {

    const targetPage = this.textContent.trim().toLowerCase();

    // show only the page matching the clicked link
    for (let j = 0; j < pages.length; j++) {
      pages[j].classList.toggle("active", pages[j].dataset.page === targetPage);
    }

    // highlight only the clicked link
    for (let j = 0; j < navigationLinks.length; j++) {
      navigationLinks[j].classList.toggle("active", navigationLinks[j] === this);
    }

    window.scrollTo(0, 0);

  });
}