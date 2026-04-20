export type App = any
export type IObject = Record<string, any>

export class Plugin {
  constructor(public options?: any) {}
}

export const getBackend = () => "windows"
export const getFrontend = () => "desktop"
export const showMessage = () => {}
export const confirm = () => {}

export const fetchPost = (_url: string, _body: any, callback: (data: any) => void) => {
  callback({ code: 0 })
}
