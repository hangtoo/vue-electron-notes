const { contextBridge, ipcRenderer } = require('electron')
const Datastore = require('nedb-promises')
const dayjs = require('dayjs')
const crypto = require('crypto')

const algorithm = 'aes-128-cbc' // 加密算法类型
const password = 'vue-electron-notes' // 用于生成秘钥的密码
const key = crypto.scryptSync(password, 'salt', 16) // 秘钥
const iv = Buffer.alloc(16, 0) // 初始化向量

// 获取数据库路径
ipcRenderer.invoke('get-db-path').then(dbPath => {
  // 在这里你可以将路径传递给一个专门处理数据库操作的模块或者函数
  // 注意：实际操作数据库应依然在主进程中进行，并通过 IPC 与渲染进程通信
  const db = {
    markdown: new Datastore({
      autoload: true,
      timestampData: true,
      filename: dbPath,
      afterSerialization(plaintext) {
        // 实例化一个cipher加密对象，使用加密算法进行加密，key作为密钥
        // 使用cipher对 plaintext 进行加密，源数据类型为utf-8，输出数据类型为hex
        const cipher = crypto.createCipheriv(algorithm, key, iv)
        let crypted = cipher.update(plaintext, 'utf-8', 'hex')
        crypted += cipher.final('hex')
        return crypted
      },
      beforeDeserialization(ciphertext) {
        // 实例化一个decipher解密对象，使用解密算法进行解密，key作为密钥
        // 使用decipher对 ciphertext 进行解密，源数据类型为hex，输出数据类型为utf-8
        const decipher = crypto.createDecipheriv(algorithm, key, iv)
        let decrypted = decipher.update(ciphertext, 'hex', 'utf-8')
        decrypted += decipher.final('utf-8')
        return decrypted
      }
    })
  }

  contextBridge.exposeInMainWorld('markdown', {
    find: async function(args) {
      const list = await db.markdown.find(args).sort({ isTop: -1, updatedAt: -1 })
      console.log(list)
      const fileList = list.map(item => {
        item.originalContent = item.content
        item.createdAt = dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')
        item.updatedAt = dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')
        return item
      })
      // let fileList = [{a:1}]
      console.log(fileList)
      return fileList
    },

    insert: async function() {
      const defaultFile = { title: '无标题笔记', content: '', isTop: false }
      return db.markdown.insert(defaultFile)
    },
    update: async (args1, args2) => {
      console.log(args1)
      console.log(args2)
      const update = await db.markdown.update(args1, args2)
      return update
    }

  })
})
