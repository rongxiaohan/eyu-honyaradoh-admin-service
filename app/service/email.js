"use strict";

const Service = require("egg").Service;

const nodemailer = require("nodemailer");
class EmailService extends Service {
	/**
	 * @description 发送邮件
	 * @author bubao
	 * @date 2021-11-15 11:11:37
	 * @param {{subject:String,contents:String}} props subject:邮件标题,contents:邮件正文
	 * @return {boolean} true
	 * @memberof EmailService
	 */
	async sendMail(props) {
		const { app } = this;
		const { subject, contents, toEmail } = props;
		const notify_email = app.config.notify_email;
		// console.log("notify_email=============", notify_email);
		const transporter = nodemailer.createTransport({
			host: notify_email.smtp,
			port: 465,
			auth: {
				user: notify_email.from,
				pass: notify_email.password // 授权码,通过QQ获取
			}
		});
		const mailOptions = {
			from: notify_email.from, // 发送者
			to: toEmail, // 接受者,可以同时发送多个,以逗号隔开
			subject, // 标题
			html: contents
		};
		return await new Promise((resolve, reject) => {
			const result = {
				code: 0,
				msg: "发送成功!"
			};
			// eslint-disable-next-line no-unused-vars
			transporter.sendMail(mailOptions, (err, info) => {
				if (err) {
					// console.log(err);
					result.code = -1;
					result.msg = err;

					reject(result);
					return;
				}
				resolve(result);
			});
		});
	}
}

module.exports = EmailService;
