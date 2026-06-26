// Puente seguro entre el proceso principal y la interfaz (renderer).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studio", {
  getSources: () => ipcRenderer.invoke("get-sources"),
  getDisplay: () => ipcRenderer.invoke("get-display"),
  startCapture: () => ipcRenderer.send("start-capture"),
  stopCapture: () => ipcRenderer.send("stop-capture"),
  saveVideo: (payload) => ipcRenderer.invoke("save-video", payload),
  saveProject: (payload) => ipcRenderer.invoke("save-project", payload),
  openProject: () => ipcRenderer.invoke("open-project"),
  getAiConfig: () => ipcRenderer.invoke("get-ai-config"),
  transcribe: (payload) => ipcRenderer.invoke("transcribe", payload),
  log: (msg) => ipcRenderer.send("renderer-log", msg),
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
