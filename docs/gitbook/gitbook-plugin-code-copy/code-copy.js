require(["gitbook"], function (gitbook) {
  "use strict";

  var MIN_COLLAPSIBLE_LINES = 8;

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

  function toggleCode(button, container) {
    var expanded = container.classList.toggle("code-expanded");

    button.textContent = expanded ? "−" : "+";
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    button.setAttribute("aria-label", expanded ? "折叠代码" : "展开代码");
    button.title = expanded ? "折叠代码" : "展开代码";
  }

  function addLineNumbers(container, lineCount) {
    var numbers = [];
    var gutter = document.createElement("span");
    var line;

    for (line = 1; line <= lineCount; line += 1) {
      numbers.push(String(line));
    }

    gutter.className = "code-line-numbers";
    gutter.textContent = numbers.join("\n");
    gutter.setAttribute("aria-hidden", "true");
    container.classList.add("code-with-line-numbers");
    container.insertBefore(gutter, container.firstChild);
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

      var codeText = code.textContent.replace(/\n$/, "");
      var lineCount = codeText ? codeText.split("\n").length : 0;

      if (lineCount > 0) {
        addLineNumbers(container, lineCount);
      }

      if (lineCount >= MIN_COLLAPSIBLE_LINES) {
        var collapseButton = document.createElement("button");

        container.classList.add("code-collapsible");
        collapseButton.type = "button";
        collapseButton.className = "code-collapse-button";
        collapseButton.textContent = "+";
        collapseButton.setAttribute("aria-expanded", "false");
        collapseButton.setAttribute("aria-label", "展开代码");
        collapseButton.title = "展开代码";
        collapseButton.addEventListener("click", function () {
          toggleCode(collapseButton, container);
        });

        container.appendChild(collapseButton);
      }

      container.appendChild(button);
    });
  }

  gitbook.events.bind("page.change", addCopyButtons);
});
