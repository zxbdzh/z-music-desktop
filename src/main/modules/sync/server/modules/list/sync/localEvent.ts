import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { registerListActionEvent } from '../../../../listEvent'
import { getUserSpace } from '../../../user'

// let socket: LX.Sync.Server.Socket | null
let unregisterLocalListAction: (() => void) | null

const sendListAction = async (
  wss: LX.Sync.Server.SocketServer,
  action: LX.Sync.List.ActionList
) => {
  // console.log('sendListAction', action.action)
  const userSpace = getUserSpace()
  const clients = [...wss.clients].filter((client) => client.moduleReadys?.list)
  if (!clients.length) return
  const key = await userSpace.listManage.createSnapshot()

  for (const client of clients) {
    void client.remoteQueueList
      .onListSyncAction(action)
      .then(async () => {
        return userSpace.listManage.updateDeviceSnapshotKey(client.keyInfo.clientId, key)
      })
      .catch((err) => {
        // TODO send status
        client.close(SYNC_CLOSE_CODE.failed)
        // client.moduleReadys.list = false
        console.log(err.message)
      })
  }
}

export const registerEvent = (wss: LX.Sync.Server.SocketServer) => {
  // socket = _socket
  // socket.onClose(() => {
  //   unregisterLocalListAction?.()
  //   unregisterLocalListAction = null
  // })
  unregisterEvent()
  unregisterLocalListAction = registerListActionEvent((action) => {
    void sendListAction(wss, action)
  })
}

export const unregisterEvent = () => {
  unregisterLocalListAction?.()
  unregisterLocalListAction = null
}
