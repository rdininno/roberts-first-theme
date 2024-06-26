function formatMoney(cents, format) {
  if (typeof cents == "string") {
    cents = cents.replace(".", "");
  }
  var value = "";
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = format || this.money_format;

  function defaultOption(opt, def) {
    return typeof opt == "undefined" ? def : opt;
  }

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ",");
    decimal = defaultOption(decimal, ".");

    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    var parts = number.split("."),
      dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + thousands),
      cents = parts[1] ? decimal + parts[1] : "";

    return dollars + cents;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case "amount":
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
  }

  return formatString.replace(placeholderRegex, value);
}

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function updateCartItemCounts(count) {
  document.querySelectorAll(".cart-count, .cart-count-bubble").forEach((el) => {
    el.textContent = count;
  });
}

function calculateTotalItemCount() {
  let totalItemCount = 0;

  const quantityInputs = document.querySelectorAll(
    ".cart-item-quantity input.quantity"
  );

  quantityInputs.forEach((input) => {
    totalItemCount += parseInt(input.value);
  });

  return totalItemCount;
}

document
  .querySelectorAll(".cart-quantity-selector button")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const isPlus = button.classList.contains("plus");
      const input = button.parentElement.querySelector("input");
      const value = Number(input.value);
      const key = button.closest(".cart-item").getAttribute("data-key");

      if (isPlus) {
        const newValue = value + 1;
        input.value = newValue;
        changeItemQuantity(key, newValue);
        updateCartItemCounts(newValue);
      } else if (value > 1) {
        const newValue = value - 1;
        input.value = newValue;
        changeItemQuantity(key, newValue);
        updateCartItemCounts(newValue);
      }

      const totalItemCount = calculateTotalItemCount();
      updateCartItemCounts(totalItemCount);
    });
  });

document.querySelector(".width").addEventListener("click", function (e) {
  if (e.target.classList.contains("remove-item")) {
    e.preventDefault();
    const item = e.target.closest(".cart-item");
    const key = item.getAttribute("data-key");

    axios
      .post("/cart/change.js", {
        id: key,
        quantity: 0,
      })
      .then((res) => {
        if (res.data.items.length === 0) {
          document.querySelector("#cart-form").remove();

          const html = document.createElement("div");
          html.innerHTML = `
                    <h1>Cart</h1>
                    <div class="cart-empty">
                        <p>Your Cart is Empty</p>
                        <a class="button" href="/">Keep shopping</a>
                    </div>`;
          document.querySelector(".cart .width").appendChild(html);
        } else {
          const format = document
            .querySelector(`[data-money-format]`)
            .getAttribute("data-money-format");
          const totalDiscount = formatMoney(res.data.total_discount, format);
          const totalPrice = formatMoney(res.data.total_price, format);

          document.querySelector("#total-discount").textContent = totalDiscount;
          document.querySelector("#total-price").textContent = totalPrice;

          item.remove();
        }
      })
      .catch((error) => {
        console.error("Error removing item:", error);
      });
  }
});

document.querySelector('[name="note"]').addEventListener(
  "keyup",
  debounce((e) => {
    axios.post("/cart/update.js", {
      note: e.target.value,
    });
  }),
  500
);

function changeItemQuantity(key, quantity) {
  axios
    .post("/cart/change.js", {
      id: key,
      quantity,
    })
    .then((res) => {
      const format = document
        .querySelector(`[data-money-format]`)
        .getAttribute("data-money-format");
      const totalDiscount = formatMoney(res.data.total_discount, format);
      const totalPrice = formatMoney(res.data.total_price, format);
      const item = res.data.items.find((item) => item.key === key);
      const itemPrice = formatMoney(item.final_line_price, format);

      document.querySelector("#total-discount").textContent = totalDiscount;
      document.querySelector("#total-price").textContent = totalPrice;
      document.querySelector(
        `[data-key="${key}"] .line-item-price`
      ).textContent = itemPrice;
    });
}
