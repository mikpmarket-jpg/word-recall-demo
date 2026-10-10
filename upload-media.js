/* Large media blobs stay out of localStorage. */
(() => {
  let opening;
  function database() {
    if (!opening) opening = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('Media storage unavailable'));
      const request = indexedDB.open('word-recall-upload-media', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Media storage blocked'));
    });
    return opening;
  }
  async function run(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('files', mode);
      const request = operation(transaction.objectStore('files'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Storage aborted'));
    });
  }
  window.UploadMedia = {
    put: (id, file) => run('readwrite', store => store.put(file, id)),
    get: id => run('readonly', store => store.get(id)),
    remove: id => run('readwrite', store => store.delete(id))
  };
})();
