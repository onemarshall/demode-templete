export function LoadingNavbar(runAnimations: () => void) {
  const styleClass = document.body.classList;

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const header = (mutation.target as Element).querySelector('.fx-navbar');
        if (header) {
          observer.disconnect();
          setTimeout(() => {
            styleClass.remove('is-loading');
            styleClass.add('is-loaded');
            runAnimations();
          }, 250);
          return;
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}
