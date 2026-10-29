require(["gitbook"], function (gitbook) {
  "use strict";

  var MIN_SCALE = 0.5;
  var MAX_SCALE = 6;
  var overlay = null;
  var preview = null;
  var closeButton = null;
  var previousFocus = null;
  var scale = 1;
  var translateX = 0;
  var translateY = 0;
  var pointers = {};
  var dragStart = null;
  var pinchStart = null;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function pointerList() {
    return Object.keys(pointers).map(function (id) {
      return pointers[id];
    });
  }

  function distance(first, second) {
    var deltaX = second.x - first.x;
    var deltaY = second.y - first.y;

    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  function midpoint(first, second) {
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2
    };
  }

  function updateTransform() {
    preview.style.transform =
      "translate(-50%, -50%) translate(" + translateX + "px, " +
      translateY + "px) scale(" + scale + ")";
  }

  function resetView() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  }

  function clearPointers() {
    pointers = {};
    dragStart = null;
    pinchStart = null;
    if (preview) {
      preview.classList.remove("image-zoom-dragging");
    }
  }

  function closeViewer() {
    if (!overlay || !overlay.classList.contains("image-zoom-visible")) {
      return;
    }

    overlay.classList.remove("image-zoom-visible");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("image-zoom-open");
    clearPointers();

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  function openViewer(source) {
    ensureViewer();
    previousFocus = document.activeElement;
    preview.src = source.currentSrc || source.src;
    preview.alt = source.alt || "图片预览";
    resetView();
    overlay.classList.add("image-zoom-visible");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-zoom-open");
    closeButton.focus();
  }

  function beginPointer(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    pointers[event.pointerId] = { x: event.clientX, y: event.clientY };

    if (preview.setPointerCapture) {
      preview.setPointerCapture(event.pointerId);
    }

    var activePointers = pointerList();

    if (activePointers.length === 1) {
      dragStart = {
        pointerX: activePointers[0].x,
        pointerY: activePointers[0].y,
        translateX: translateX,
        translateY: translateY
      };
      preview.classList.add("image-zoom-dragging");
    } else if (activePointers.length === 2) {
      pinchStart = {
        distance: Math.max(distance(activePointers[0], activePointers[1]), 1),
        center: midpoint(activePointers[0], activePointers[1]),
        scale: scale,
        translateX: translateX,
        translateY: translateY
      };
    }
  }

  function movePointer(event) {
    if (!pointers[event.pointerId]) {
      return;
    }

    event.preventDefault();
    pointers[event.pointerId] = { x: event.clientX, y: event.clientY };

    var activePointers = pointerList();

    if (activePointers.length >= 2 && pinchStart) {
      var currentCenter = midpoint(activePointers[0], activePointers[1]);
      var currentDistance = distance(activePointers[0], activePointers[1]);

      scale = clamp(
        pinchStart.scale * currentDistance / pinchStart.distance,
        MIN_SCALE,
        MAX_SCALE
      );
      translateX = pinchStart.translateX + currentCenter.x - pinchStart.center.x;
      translateY = pinchStart.translateY + currentCenter.y - pinchStart.center.y;
      updateTransform();
    } else if (activePointers.length === 1 && dragStart) {
      translateX = dragStart.translateX + activePointers[0].x - dragStart.pointerX;
      translateY = dragStart.translateY + activePointers[0].y - dragStart.pointerY;
      updateTransform();
    }
  }

  function endPointer(event) {
    delete pointers[event.pointerId];

    var activePointers = pointerList();
    pinchStart = null;

    if (activePointers.length === 1) {
      dragStart = {
        pointerX: activePointers[0].x,
        pointerY: activePointers[0].y,
        translateX: translateX,
        translateY: translateY
      };
    } else {
      dragStart = null;
      preview.classList.remove("image-zoom-dragging");
    }
  }

  function zoomWithWheel(event) {
    if (!overlay.classList.contains("image-zoom-visible")) {
      return;
    }

    event.preventDefault();

    var previousScale = scale;
    var multiplier = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    var nextScale = clamp(previousScale * multiplier, MIN_SCALE, MAX_SCALE);

    if (nextScale === previousScale) {
      return;
    }

    var offsetX = event.clientX - window.innerWidth / 2 - translateX;
    var offsetY = event.clientY - window.innerHeight / 2 - translateY;
    var ratio = nextScale / previousScale;

    translateX -= offsetX * (ratio - 1);
    translateY -= offsetY * (ratio - 1);
    scale = nextScale;
    updateTransform();
  }

  function ensureViewer() {
    if (overlay) {
      return;
    }

    overlay = document.createElement("div");
    overlay.className = "image-zoom-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "图片预览");

    preview = document.createElement("img");
    preview.className = "image-zoom-preview";
    preview.alt = "图片预览";
    preview.draggable = false;

    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "image-zoom-close";
    closeButton.setAttribute("aria-label", "关闭图片预览");
    closeButton.title = "关闭";
    closeButton.textContent = "×";

    var hint = document.createElement("p");
    hint.className = "image-zoom-hint";
    hint.textContent = "滚轮或双指缩放 · 拖动查看 · 双击复位 · Esc 关闭";

    overlay.appendChild(preview);
    overlay.appendChild(closeButton);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        closeViewer();
      }
    });
    overlay.addEventListener("wheel", zoomWithWheel, { passive: false });
    closeButton.addEventListener("click", closeViewer);

    preview.addEventListener("dblclick", function (event) {
      event.preventDefault();
      event.stopPropagation();
      resetView();
    });
    preview.addEventListener("pointerdown", beginPointer);
    preview.addEventListener("pointermove", movePointer);
    preview.addEventListener("pointerup", endPointer);
    preview.addEventListener("pointercancel", endPointer);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeViewer();
      }
    });
  }

  function initializeImages() {
    ensureViewer();

    var images = document.querySelectorAll(".markdown-section img");

    Array.prototype.forEach.call(images, function (image) {
      if (image.getAttribute("data-image-zoom-ready") === "true") {
        return;
      }

      image.setAttribute("data-image-zoom-ready", "true");
      image.classList.add("image-zoom-source");
      image.addEventListener("dblclick", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openViewer(image);
      });
    });
  }

  gitbook.events.bind("page.change", function () {
    closeViewer();
    initializeImages();
  });
});
