// Scroll-triggered reveal: fades/slides elements in as they enter the viewport.
// Falls back to fully-visible (no animation) when the user prefers reduced
// motion or IntersectionObserver is unavailable.
document.addEventListener('DOMContentLoaded', function () {
    var targets = document.querySelectorAll(
        '.chapter-head, .visualization-container, .pull-quote, .callout, .closing-note'
    );

    var reduceMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
        targets.forEach(function (el) { el.classList.add('reveal-visible'); });
        return;
    }

    targets.forEach(function (el) { el.classList.add('reveal'); });

    // Stagger callouts within the same row for a cascading effect.
    document.querySelectorAll('.callout-row').forEach(function (row) {
        row.querySelectorAll('.callout').forEach(function (c, i) {
            c.style.transitionDelay = (i * 0.1) + 's';
        });
    });

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { observer.observe(el); });
});
