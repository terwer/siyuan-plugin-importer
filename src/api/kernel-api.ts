/*
 * Copyright (c) 2023, Terwer . All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Terwer designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Terwer in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
 * or visit www.terwer.space if you need additional information or have any
 * questions.
 */

import { BaseApi, SiyuanData } from "./base-api"
import {mediaDir, siyuanApiToken, siyuanApiUrl} from "../Constants"
import { fetchPost } from "siyuan"

/**
 * 思源笔记服务端API v2.8.8
 *
 * @see {@link https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md API}
 *
 * @author terwer
 * @version 1.0.0
 * @since 1.0.0
 */
class KernelApi extends BaseApi {
  /**
   * 列出笔记本
   */
  public async lsNotebooks(): Promise<SiyuanData> {
    return await this.siyuanRequest("/api/notebook/lsNotebooks", {})
  }

  /**
   * 打开笔记本
   *
   * @param notebookId - 笔记本ID
   */
  public async openNotebook(notebookId: string): Promise<SiyuanData> {
    return await this.siyuanRequest("/api/notebook/openNotebook", {
      notebook: notebookId,
    })
  }

  /**
   * 写入文件
   *
   * @param path - 文件路径，例如：/data/20210808180117-6v0mkxr/20200923234011-ieuun1p.sy
   * @param file - 上传的文件
   */
  public putFile(path: string, file: any): Promise<SiyuanData> {
    const formData = new FormData()
    formData.append("path", path)
    formData.append("isDir", "false")
    formData.append("modTime", Math.floor(Date.now() / 1000).toString())
    formData.append("file", file)

    return new Promise((resolve, reject) => {
      fetchPost("/api/file/putFile", formData, (data) => {
        if (data.code === 0) {
          resolve(data)
        } else {
          reject(data)
        }
      })
    })
  }

  /**
   * 转换服务
   *
   * @param type - 类型
   * @param from - 原始文件名，不包括路径，路径必须放在 /temp/convert/pandoc
   * @param to - 转换后的文件名，不包括路径，路径相对于 /temp/convert/pandoc
   */
  public async convertPandoc(type: string, from: string, to: string): Promise<SiyuanData> {
    const args = {
      args: ["--to", type, from, "-o", to, "--extract-media", mediaDir],
    }
    return await this.siyuanRequest("/api/convert/pandoc", args)
  }

  /**
   * 读取文件
   *
   * @param path - 文件路径，例如：/data/20210808180117-6v0mkxr/20200923234011-ieuun1p.sy
   * @param type - 类型
   */
  public async getFile(path: string, type: "text" | "json") {
    const response = await fetch(`${siyuanApiUrl}/api/file/getFile`, {
      method: "POST",
      headers: {
        Authorization: `Token ${siyuanApiToken}`,
      },
      body: JSON.stringify({
        path: path,
      }),
    })
    if (response.status === 200) {
      if (type === "text") {
        return await response.text()
      }
      if (type === "json") {
        return (await response.json()).data
      }
    }
    return null
  }

  /**
   * 通过Markdown创建文档
   *
   * @param path - 路径
   */
  public async removeFile(path: string): Promise<SiyuanData> {
    const params = {
      path: path,
    }
    return await this.siyuanRequest("/api/file/removeFile", params)
  }

  /**
   * 通过Markdown创建文档
   *
   * @param notebook - 笔记本
   * @param path - 路径
   * @param md - md
   */
  public async createDocWithMd(notebook: string, path: string, md: string): Promise<SiyuanData> {
    const params = {
      notebook: notebook,
      path: path,
      markdown: md,
    }
    return await this.siyuanRequest("/api/filetree/createDocWithMd", params)
  }
}

export default KernelApi
