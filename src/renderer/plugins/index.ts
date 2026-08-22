// import './axios'
import { type App } from 'vue'
import dialog from './Dialog'
import notice from './Notice'
import './Tips'
import svgIcon from './SvgIcon'

export default (app: App) => {
  app.use(dialog)
  app.use(notice)

  svgIcon(app)
}
