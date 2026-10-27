(function () {
  "use strict";

  function scrollHashToTop(hash) {
    var targetId = decodeURIComponent(hash.slice(1));
    var target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    window.requestAnimationFrame(function () {
      var selector = window.innerWidth <= 1240 ? ".book-body" : ".body-inner";
      var scroller = document.querySelector(selector);

      if (!scroller) {
        target.scrollIntoView(true);
        return;
      }

      var targetTop = target.getBoundingClientRect().top;
      var scrollerTop = scroller.getBoundingClientRect().top;

      // scrollTop 超过可滚动范围时，浏览器会自动限制到页面底部。
      // 因此正常情况下标题位于顶部，文章末尾空间不足时才会停在中间。
      scroller.scrollTop += targetTop - scrollerTop;
    });
  }

  function finishHashAlignment(hash) {
    var path = window.location.pathname + window.location.search + hash;

    // GitBook 的滚动监听可能在文章末尾把 hash 改回上一个可顶到顶部的标题。
    // 恢复用户实际选择的锚点，并通知目录与左右箭头重新同步。
    window.history.replaceState({ path: path }, "", path);
    window.dispatchEvent(new Event("gitbook-anchor-aligned"));
  }

  function alignHash(hash) {
    scrollHashToTop(hash);

    // 等待 GitBook 的滚动监听执行完，再做一次最终定位和高亮校正。
    window.setTimeout(function () {
      scrollHashToTop(hash);
      window.requestAnimationFrame(function () {
        finishHashAlignment(hash);
      });
    }, 80);
  }

  // 直接打开带锚点的网址、使用浏览器前进后退时，也统一校正标题位置。
  window.addEventListener("hashchange", function () {
    if (window.location.hash) {
      alignHash(window.location.hash);
    }
  });

  window.addEventListener("load", function () {
    if (window.location.hash) {
      alignHash(window.location.hash);
    }
  });

  document.addEventListener("click", function (event) {
    if (
      event.target &&
      event.target.classList &&
      event.target.classList.contains("exc-trigger")
    ) {
      return;
    }

    var link = event.target;

    while (link && link.tagName !== "A") {
      link = link.parentNode;
    }

    if (!link || !link.href || link.target || event.button !== 0) {
      return;
    }

    var url = new URL(link.href, window.location.href);

    // GitBook 会用 history.pushState() 处理同页锚点，但 pushState 不会触发
    // hashchange，导致上一项/下一项箭头停留在旧链接。本地和在线阅读时
    // 都改由浏览器直接修改 hash，使正文滚动和箭头更新保持同步。
    if (
      url.protocol === window.location.protocol &&
      url.host === window.location.host &&
      url.pathname === window.location.pathname &&
      url.hash
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (window.location.hash !== url.hash) {
        window.location.hash = url.hash;
      } else {
        alignHash(url.hash);
      }
      return;
    }

    // 下面的目录补全仅用于直接打开 docs/index.html 的 file:// 场景。
    if (window.location.protocol !== "file:" || url.protocol !== "file:") {
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

// 让页面两侧的上一项/下一项箭头按照侧边栏顺序导航。
// 左侧目录可以显示二、三级标题，但左右箭头只导航到章节页和二级标题。
require(["gitbook"], function (gitbook) {
  "use strict";

  var trackedScroller = null;
  var scrollFrame = null;

  function normalizedPath(pathname) {
    if (pathname.slice(-1) === "/") {
      return pathname + "index.html";
    }

    return pathname;
  }

  function chapterDepth(link, summary) {
    var depth = 0;
    var node = link.parentNode;

    while (node && node !== summary) {
      if (node.tagName === "LI" && node.classList.contains("chapter")) {
        depth += 1;
      }
      node = node.parentNode;
    }

    return depth;
  }

  function allSummaryLinks(summary) {
    return Array.prototype.filter.call(summary.querySelectorAll("li.chapter > a"), function (link) {
      var url = new URL(link.href, window.location.href);

      return url.protocol === window.location.protocol;
    });
  }

  function linkForLocation(summary) {
    var currentPath = normalizedPath(window.location.pathname);
    var currentHash = window.location.hash;
    var links = allSummaryLinks(summary);
    var index;

    for (index = 0; index < links.length; index += 1) {
      var url = new URL(links[index].href, window.location.href);

      if (normalizedPath(url.pathname) === currentPath && url.hash === currentHash) {
        return links[index];
      }
    }

    return null;
  }

  function setActiveLink(summary, link) {
    if (!link) {
      return;
    }

    Array.prototype.forEach.call(summary.querySelectorAll("li.chapter.active"), function (chapter) {
      chapter.classList.remove("active");
    });

    link.parentNode.classList.add("active");
  }

  function contentScroller() {
    var selector = window.innerWidth <= 1240 ? ".book-body" : ".body-inner";
    return document.querySelector(selector);
  }

  function linkAtViewportTop(summary, scroller) {
    var currentPath = normalizedPath(window.location.pathname);
    var scrollerTop = scroller.getBoundingClientRect().top;
    var links = allSummaryLinks(summary);
    var activeLink = null;
    var index;

    for (index = 0; index < links.length; index += 1) {
      var url = new URL(links[index].href, window.location.href);

      if (normalizedPath(url.pathname) !== currentPath) {
        continue;
      }

      if (!url.hash) {
        activeLink = links[index];
        continue;
      }

      var targetId = decodeURIComponent(url.hash.slice(1));
      var target = document.getElementById(targetId);

      if (target && target.getBoundingClientRect().top <= scrollerTop + 30) {
        activeLink = links[index];
      }
    }

    return activeLink;
  }

  function syncActiveLinkFromScroll() {
    scrollFrame = null;

    var summary = document.querySelector(".book-summary ul.summary");
    var scroller = contentScroller();

    if (!summary || !scroller) {
      return;
    }

    setActiveLink(summary, linkAtViewportTop(summary, scroller));
  }

  function scheduleActiveLinkSync() {
    if (scrollFrame === null) {
      scrollFrame = window.requestAnimationFrame(syncActiveLinkFromScroll);
    }
  }

  function bindActiveLinkTracking() {
    var scroller = contentScroller();

    if (trackedScroller === scroller) {
      return;
    }

    if (trackedScroller) {
      trackedScroller.removeEventListener("scroll", scheduleActiveLinkSync);
    }

    trackedScroller = scroller;
    if (trackedScroller) {
      trackedScroller.addEventListener("scroll", scheduleActiveLinkSync);
    }
  }

  function summaryLinks(summary) {
    return allSummaryLinks(summary).filter(function (link) {
      return chapterDepth(link, summary) <= 2;
    });
  }

  function currentLinkIndex(summary, links) {
    var currentPath = normalizedPath(window.location.pathname);
    var currentHash = window.location.hash;
    var allLinks = allSummaryLinks(summary);
    var matchedIndex = -1;
    var index;

    for (index = 0; index < allLinks.length; index += 1) {
      var url = new URL(allLinks[index].href, window.location.href);

      if (normalizedPath(url.pathname) === currentPath && url.hash === currentHash) {
        matchedIndex = index;
        break;
      }
    }

    // 如果当前点击的是不参与左右跳转的三级标题，则归到它所属的
    // 上一个二级标题，左右箭头仍指向相邻的二级标题。
    for (index = matchedIndex; index >= 0; index -= 1) {
      var navigationIndex = links.indexOf(allLinks[index]);

      if (navigationIndex >= 0) {
        return navigationIndex;
      }
    }

    return -1;
  }

  function updateArrow(selector, link, direction) {
    var arrow = document.querySelector(selector);

    if (!arrow) {
      return;
    }

    if (!link) {
      arrow.style.display = "none";
      return;
    }

    var title = link.textContent.trim();
    arrow.style.display = "";
    arrow.setAttribute("href", link.getAttribute("href"));
    arrow.setAttribute("aria-label", direction + ": " + title);
  }

  function useSidebarNavigation() {
    var summary = document.querySelector(".book-summary ul.summary");
    if (!summary) {
      return;
    }

    setActiveLink(summary, linkForLocation(summary));
    bindActiveLinkTracking();

    var links = summaryLinks(summary);
    var currentIndex = currentLinkIndex(summary, links);
    if (currentIndex < 0) {
      return;
    }

    updateArrow(
      ".navigation-prev",
      currentIndex > 0 ? links[currentIndex - 1] : null,
      "Previous page"
    );
    updateArrow(
      ".navigation-next",
      currentIndex + 1 < links.length ? links[currentIndex + 1] : null,
      "Next page"
    );
  }

  gitbook.events.bind("page.change", useSidebarNavigation);
  window.addEventListener("hashchange", useSidebarNavigation);
  window.addEventListener("gitbook-anchor-aligned", useSidebarNavigation);
});
