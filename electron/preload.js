// Puente seguro entre el proceso principal y la interfaz (renderer).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studio", {
  getSources: () => ipcRenderer.invoke("get-sources"),
  getDisplay: () => ipcRenderer.invoke("get-display"),
  startCapture: () => ipcRenderer.send("start-capture"),
  stopCapture: () => ipcRenderer.send("stop-capture"),
  saveVideo: (payload) => ipcRenderer.invoke("save-video", payload),
  onMouseEvent: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on("mouse-event", listener);
    return () => ipcRenderer.removeListener("mouse-event", listener);
  },
  onGlobalStop: (cb) => {
    const listener = () => cb();
    ipcRenderer.on("global-stop", listener);
    return () => ipcRenderer.removeListener("global-stop", listener);
  },
});
