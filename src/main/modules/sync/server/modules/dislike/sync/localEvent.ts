import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { registerDislikeActionEvent } from '../../../../dislikeEvent'
import { getUserSpace } from '../../../user'

// let socket: LX.Sync.Server.Socket | null
let unregisterLocalListAction: (() => void) | null

const sendListAction = async (
  wss: LX.Sync.Server.SocketServer,
  action: LX.Sync.Dislike.ActionList
) => {
  // console.log('sendListAction', action.action)
  const userSpace = getUserSpace()
  const clients = [...wss.clients].filter((client) => client.moduleReadys?.dislike)
  if (!clients.length) return
  const key = await userSpace.dislikeManage.createSnapshot()

  for (const client of clients) {
    void client.remoteQueueDislike
      .onDislikeSyncAction(action)
      .then(async () => {
        return userSpace.dislikeManage.updateDeviceSnapshotKey(client.keyInfo.clientId, key)
      })
      .catch((err) => {
        // TODO send status
        client.close(SYNC_CLOSE_CODE.failed)
        // client.moduleReadys.dislike = false
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
  unregisterLocalListAction = registerDislikeActionEvent((action) => {
    void sendListAction(wss, action)
  })
}

export const unregisterEvent = () => {
  unregisterLocalListAction?.()
  unregisterLocalListAction = null
}
