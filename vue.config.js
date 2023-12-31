// vue.config.js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      // 指定预加载脚本
      preload: 'src/preload.js'
      // 其他 electron-builder 相关配置...
    }
  }
}
