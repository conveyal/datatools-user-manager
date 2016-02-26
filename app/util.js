import fetch from 'isomorphic-fetch'

export function ajax (opts) {
  var url = opts.url
  if (opts.data) url += '?' + Object.keys(opts.data).map(key => key + '=' + encodeURIComponent(opts.data[key])).join('&')

  var fetchOpts = {
    method: opts.method || 'get'
  }
  if (opts.headers) fetchOpts.headers = opts.headers

  var ajax = fetch(url, fetchOpts).then((res) => {
    if (res.status >= 400) {
      throw new Error(res.statusText)
    }
    return res.json()
  })

  if (opts.success) {
    ajax = ajax.then((data) => {
      opts.success.call(this, data)
    })
  }

  if (opts.error) {
    ajax = ajax.catch((err) => {
      opts.error.call(this, err)
    })
  }

  return ajax
}
