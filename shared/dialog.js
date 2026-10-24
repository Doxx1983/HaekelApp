// Rückfragen und Hinweise im Isadody-CD statt der grauen Browser-Fenster (alert, confirm, prompt).
// Alle drei geben ein Promise zurück:
//   await Dialog.alert('Text')                                   → undefined
//   await Dialog.confirm('Text', { ok: 'Löschen' })              → true / false
//   await Dialog.prompt('Name', 'Vorschlag', { ok: 'Speichern' }) → Text / null
// Optionen: title, ok, cancel; danger: true setzt den Fokus auf „Abbrechen“ (für Löschen u. Ä.).
// Esc, „Abbrechen“ und Tipp neben das Fenster brechen ab. Ohne <dialog>-Unterstützung: Browser-Fenster.
const Dialog = (() => {
  let queue = Promise.resolve();
  const native = typeof HTMLDialogElement !== 'function';

  function open(kind, text, value, o = {}) {
    if (native) return Promise.resolve(kind === 'alert' ? alert(text) : kind === 'confirm' ? confirm(text) : prompt(text, value ?? ''));
    const d = document.createElement('dialog'); d.className = 'idlg';
    d.innerHTML = `<form method="dialog">${o.title ? '<h2></h2>' : ''}<p></p>${kind === 'prompt' ? '<input type="text" autocomplete="off">' : ''}
      <div class="idlg-btns">${kind === 'alert' ? '' : '<button type="button" class="small" value="no"></button>'}<button class="btn" value="ok"></button></div></form>`;
    if (o.title) d.querySelector('h2').textContent = o.title;
    d.querySelector('p').textContent = text;
    const inp = d.querySelector('input'), ok = d.querySelector('.btn'), no = d.querySelector('.small');
    ok.textContent = o.ok || 'OK';
    if (no) no.textContent = o.cancel || 'Abbrechen';
    if (inp) inp.value = value ?? '';
    const back = document.activeElement;
    return new Promise(res => {
      let done = false;
      const end = yes => {
        if (done) return; done = true;
        d.close(); d.remove();
        if (back && back.focus && document.contains(back)) back.focus({ preventScroll: true });
        res(kind === 'alert' ? undefined : kind === 'confirm' ? yes : yes ? inp.value : null);
      };
      d.querySelector('form').onsubmit = e => { e.preventDefault(); end(true); };
      if (no) no.onclick = () => end(false);
      d.addEventListener('cancel', e => { e.preventDefault(); end(false); });
      // Tipp auf den abgedunkelten Hintergrund (außerhalb des Fensters) = Abbrechen
      d.addEventListener('click', e => {
        if (e.target !== d) return;
        const r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) end(false);
      });
      document.body.append(d); d.showModal();
      (inp || (o.danger && no) || ok).focus();
      if (inp) inp.select();
    });
  }
  // immer nur ein Fenster gleichzeitig; weitere warten
  const show = (...a) => (queue = queue.then(() => open(...a)));
  return {
    alert: (text, o) => show('alert', text, null, o),
    confirm: (text, o) => show('confirm', text, null, o),
    prompt: (text, value, o) => show('prompt', text, value, o),
  };
})();
