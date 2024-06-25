/**
 * @Description: 腾讯云-短信
 * @Author: chenchen
 * @Date: 2021-02-19 10:48:48
 * @LastEditors: chenchen
 * @LastEditTime: 2021-02-19 11:49:23
 */
"use strict";
const { Service } = require("egg");
// 腾讯云短信服务
const QcloudSms = require("qcloudsms_js");

class TencentSMSService extends Service {
	/**
	 * @description
	 * @author bubao
	 * @date 2021-11-25 14:11:12
	 * @param {number} templateId 模板id 默认 app.config.private.SMS.Tencent.
	 * @param {strng} phone_number 手机号码
	 * @param {Array<String>} [params=[]] ["1234"]
	 * @return {Promise<>} sms数据
	 * @memberof TencentSMSService
	 */
	async sendSMS(templateId, phone_number, params = []) {
		const { app } = this;
		const { appid, appkey } = app.config.private.SMS.Tencent.options;
		// const appid = 1400245830 // SDK AppID 以1400开头
		// // 短信应用 SDK AppKey
		// const appkey = 'f0baf32d26df5f97b8a4cc8a1bc68797'
		// // 需要发送短信的手机号码
		// // 短信模板 ID，需要在短信控制台中申请
		// const templateId = props.templateId || 401173 // NOTE: 这里的模板ID`7839`只是示例，真实的模板 ID 需要在短信控制台中申请
		// 签名
		// const smsSign = '亿语智能' // NOTE: 签名参数使用的是`签名内容`，而不是`签名ID`。这里的签名"腾讯云"只是示例，真实的签名需要在短信控制台申请
		// 实例化 QcloudSms
		const qcloudsms = QcloudSms(appid, appkey);
		const ssender = qcloudsms.SmsSingleSender();
		const SendSms = await new Promise(resolve => {
			ssender.sendWithParam(
				86,
				phone_number, // 手机号码
				templateId,
				params,
				app.config.private.SMS.SignName,
				"",
				"",
				function(err, res, resData) {
					// console.log(resData);
					if (err) {
						// console.log("err: ", err);
						resolve({
							Code: "error",
							Message: "error"
						});
					} else {
						resolve({
							Code: "OK",
							Message: "OK"
						});
					}
				}
			);
		});
		return SendSms;
	}
}

module.exports = TencentSMSService;
