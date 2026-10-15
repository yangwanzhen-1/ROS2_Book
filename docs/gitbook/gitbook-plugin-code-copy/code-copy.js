require(["gitbook"], function (gitbook) {
  "use strict";

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    var copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }

  function showResult(button, copied) {
    button.textContent = copied ? "已复制" : "复制失败";
    button.classList.toggle("code-copy-failed", !copied);

    window.setTimeout(function () {
      button.textContent = "复制";
      button.classList.remove("code-copy-failed");
    }, 1500);
  }

  function copyCode(button, code) {
    var text = code.textContent;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showResult(button, true);
      }).catch(function () {
        showResult(button, fallbackCopy(text));
      });
      return;
    }

    showResult(button, fallbackCopy(text));
  }

  function addCopyButtons() {
    var blocks = document.querySelectorAll(".markdown-section pre > code");

    Array.prototype.forEach.call(blocks, function (code) {
      var container = code.parentNode;

      if (container.getAttribute("data-code-copy-ready") === "true") {
        return;
      }

      var button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-button";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");
      button.addEventListener("click", function () {
        copyCode(button, code);
      });

      container.setAttribute("data-code-copy-ready", "true");
      container.appendChild(button);
    });
  }

  gitbook.events.bind("page.change", addCopyButtons);
});
