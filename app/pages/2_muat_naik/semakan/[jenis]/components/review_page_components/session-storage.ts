export const SESSION_STORAGE_CHANGE_EVENT = "extract-review-storage";

export const subscribeToSessionStorage = (onStoreChange: () => void) => {
  window.addEventListener(SESSION_STORAGE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(SESSION_STORAGE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

export const notifySessionStorageChange = () => {
  window.dispatchEvent(new Event(SESSION_STORAGE_CHANGE_EVENT));
};
