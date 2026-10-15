(function () {
  "use strict";

  if (window.location.protocol !== "file:") {
    return;
  }

  document.addEventListener("click", function (event) {
    var link = event.target;

    while (link && link.tagName !== "A") {
      link = link.parentNode;
    }

    if (!link || !link.href || link.target || event.button !== 0) {
      return;
    }

    var url = new URL(link.href, window.location.href);

    if (url.protocol !== "file:") {
      return;
    }

    if (url.pathname === window.location.pathname && url.hash) {
      return;
    }

    if (url.pathname.slice(-1) === "/") {
      url.pathname += "index.html";
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = url.href;
  }, true);
}());
