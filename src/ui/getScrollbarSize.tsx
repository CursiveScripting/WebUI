export function getScrollbarSize() {
    let outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.width = '100px';
    outer.style.height = '100px';
    outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps

    document.body.appendChild(outer);

    let widthNoScroll = outer.offsetWidth;
    let heightNoScroll = outer.offsetHeight;

    // force scrollbars
    outer.style.overflow = 'scroll';

    // add innerdiv
    let inner = document.createElement('div');
    inner.style.width = '100%';
    inner.style.height = '100%';
    outer.appendChild(inner);

    let widthWithScroll = inner.offsetWidth;
    let heightWithScroll = inner.offsetHeight;

    // remove divs
    if (outer.parentNode !== null) {
        outer.parentNode.removeChild(outer);
    }

    return {
        width: widthNoScroll - widthWithScroll,
        height: heightNoScroll - heightWithScroll,
    };
}