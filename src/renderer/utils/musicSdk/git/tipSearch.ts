import { loadDatabase, extractNameFromFile } from './util'

export default {
  requestObj: null as { promise: Promise<any>; cancelHttp: () => void } | null,

  async tipSearchByKeyword(str: string): Promise<any[]> {
    this.cancelTipSearch()

    let canceled = false
    const promise = (async (): Promise<any[]> => {
      if (canceled) throw new Error('请求已取消')

      const database = await loadDatabase()
      if (canceled) throw new Error('请求已取消')
      if (!database || database.length === 0) throw new Error('数据库为空')

      const filtered = str
        ? database.filter((item: any) => {
            const title = item.title || extractNameFromFile(item.filename)
            return title.toLowerCase().includes(str.toLowerCase())
          })
        : database

      return [...filtered].sort(() => Math.random() - 0.5).slice(0, 5)
    })()

    this.requestObj = {
      promise,
      cancelHttp: () => {
        canceled = true
      },
    }

    return this.requestObj.promise
  },

  handleResult(rawData: any[]): { keyword: string; type: string }[] {
    return rawData.map((item: any) => ({
      keyword: item.title || extractNameFromFile(item.filename),
      type: 'git',
    }))
  },

  cancelTipSearch(): void {
    if (this.requestObj && this.requestObj.cancelHttp) {
      this.requestObj.cancelHttp()
    }
  },

  async search(str: string): Promise<{ keyword: string; type: string }[]> {
    return this.tipSearchByKeyword(str).then((result) => this.handleResult(result))
  },
}
