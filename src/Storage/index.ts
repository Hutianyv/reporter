import Dexie, { Table } from "dexie";

export interface StoreUserAction {
    id?: number
    userName: string
  }
  
  export class UserActionBase extends Dexie {
    userAction!: Table<StoreUserAction>
  
    localVersions = 1
  
    constructor() {
      super('river-UserActionBase')
  
      this.version(this.localVersions).stores({
        userAction: '++id, pageUrl, event, dom, timeStamp'
      })
  
      this.userAction = this.table('userAction')
    }
  }
  
  export const usersDB = new UserActionBase()
  