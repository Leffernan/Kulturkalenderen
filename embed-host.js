(() => {
  'use strict';

  const widget = 'bygdebladet-kulturkalender';
  const site = new URL('./', document.currentScript.src);

  function matches(frame) {
    const url = new URL(frame.src, document.baseURI);
    return url.origin === site.origin &&
      (url.pathname === site.pathname || url.pathname === site.pathname + 'index.html');
  }

  window.addEventListener('message', event => {
    if (event.origin !== site.origin || event.data?.widget !== widget ||
        event.data.type !== 'height') return;
    const { height } = event.data;
    if (!Number.isInteger(height) || height < 1 || height > 30000) return;
    const frame = [...document.querySelectorAll('iframe')].find(element =>
      element.contentWindow === event.source && matches(element));
    if (frame) frame.style.height = height + 'px';
  });

  for (const frame of document.querySelectorAll('iframe')) {
    if (!matches(frame)) continue;
    const measure = () => frame.contentWindow?.postMessage({ widget, type: 'measure' }, site.origin);
    frame.addEventListener('load', measure);
    measure();
  }
})();
