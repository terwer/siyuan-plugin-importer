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

/**
 * 思源笔记服务端API v2.8.8
 *
 * @author terwer
 * @version 1.0.0
 * @since 1.0.0
 */
class KernelApi extends BaseApi {
  /**
   * 推送消息
   *
   * 参数
   *
   * ```json
   * {
   *   "msg": "test",
   *   "timeout": 7000
   * }
   * ```
   *
   * timeout：消息持续显示时间，单位为毫秒。可以不传入该字段，默认为 7000 毫秒
   *
   * 返回值
   *
   * ```
   * {
   *   "code": 0,
   *   "msg": "",
   *   "data": {
   *       "id": "62jtmqi"
   *   }
   * }
   *
   * id：消息 ID
   * ```
   *
   * @param msg 消息
   */
  public async pushMsg(msg: string): Promise<SiyuanData> {
    const msgObj = {
      msg: msg,
      timeout: 3000,
    }
    return await this.siyuanRequest("/api/notification/pushMsg", msgObj)
  }

  /**
   * 推送报错消息
   *
   * 参数
   *
   * ```
   * {
   *   "msg": "test",
   *   "timeout": 7000
   * }
   * ```
   *
   * timeout：消息持续显示时间，单位为毫秒。可以不传入该字段，默认为 7000 毫秒
   *
   * 返回值
   *
   * ```
   * {
   *   "code": 0,
   *   "msg": "",
   *   "data": {
   *       "id": "qc9znut"
   *   }
   * }
   *
   * id：消息 ID
   * ```
   *
   * @param msg - 错误消息
   */
  public async pushErrMsg(msg: string): Promise<SiyuanData> {
    const msgObj = {
      msg: msg,
      timeout: 3000,
    }
    return await this.siyuanRequest("/api/notification/pushErrMsg", msgObj)
  }
}

export default KernelApi
