/**
 * @Description:
 * @author: bubao
 * @Date: 2021-11-10 15:45:34
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 18:06:50
 */
"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
	const { router, controller, middleware } = app;
	const nmCheckAuth = middleware.nmCheckAuth;

	// =========== 后台管理系统 ===============

	router.post("/api/nm/v1/fallback", nmCheckAuth(), controller.v1.generic.fallback);
	// ************** 用户管理 ********************
	router.get("/api/nm/v1/login/svg_captha", controller.v1.nmUser.sendCaptchaToLogin); // 邮箱登录
	router.post("/api/nm/v1/login/email", controller.v1.nmUser.loginByEmail); // 邮箱登录
	router.post("/api/nm/v1/captcha", controller.v1.nmUser.sendMailToLogin); // 发送邮箱登录验证码
	router.put("/api/nm/v1/logout", controller.v1.nmUser.logout); // 安全退出
	router.put("/api/nm/v1/reauth", controller.v1.nmUser.refreshToken); // 刷新token
	router.get("/api/nm/v1/user/list", nmCheckAuth(["r", "A"]), controller.v1.nmUser.getNmUsersList); // 获取用户列表
	router.post("/api/nm/v1/upload/head", nmCheckAuth(["r", "A"]), controller.v1.upload.uploadCreatedNmUserHeadPortrait); // 上传用户头像
	router.post("/api/nm/v1/user", nmCheckAuth(["r", "A"]), controller.v1.nmUser.createUser); // 新增用户
	router.get("/api/nm/v1/user/info", nmCheckAuth(["r", "A"]), controller.v1.nmUser.getNmUserByUserId); // 根据id获取用户信息
	router.put("/api/nm/v1/user", nmCheckAuth(["r", "A"]), controller.v1.nmUser.updateNmUserInfoById); // 根据id更新用户信息
	router.put("/api/nm/v1/user/status", nmCheckAuth(["r", "A"]), controller.v1.nmUser.updateNmUserStatusById); // 根据id更新用户状态
	router.delete("/api/nm/v1/user", nmCheckAuth(["r", "A"]), controller.v1.nmUser.delNmUserById); // 根据id删除用户

	// ************** 饮食管理 ********************
	router.get("/api/nm/v1/dietary/list", nmCheckAuth(), controller.v1.nmDailyDietary.getDailyDietaryList); // 获取列表
	router.post("/api/nm/v1/dietary", nmCheckAuth(), controller.v1.nmDailyDietary.createDailyDietary); // 创建一条，并返回id
	router.post("/api/nm/v1/dietary/upload/cover", nmCheckAuth(), controller.v1.upload.uploadDailyDietaryCover); // 上传封面

	router.post("/api/nm/v1/dietary/upload", nmCheckAuth(), controller.v1.upload.uploadDailyDietary); // 上传其他资源

	router.put("/api/nm/v1/dietary/draft", nmCheckAuth(), controller.v1.nmDailyDietary.saveDailyDietaryAsDraft); // 保存为草稿
	router.put("/api/nm/v1/dietary/article", nmCheckAuth(["r", "A"]), controller.v1.nmDailyDietary.saveDailyDietaryAsArticle); // 保存为发布文章
	router.get("/api/nm/v1/dietary", nmCheckAuth(), controller.v1.nmDailyDietary.getDailyDietaryInfoToEdite); // 获取一条文章详细信息用于编辑
	router.put("/api/nm/v1/dietary/status", nmCheckAuth(["r", "A"]), controller.v1.nmDailyDietary.changeDailyDietaryStatus); // 修改文章的状态，录入员不允许修改
	router.delete("/api/nm/v1/dietary", nmCheckAuth(["r", "A"]), controller.v1.nmDailyDietary.deleteDailyDietary); // 根据id删除一条文章

	// ************** 健康管理 ********************
	router.get("/api/nm/v1/health/list", nmCheckAuth(), controller.v1.nmHealth.getList); // 获取列表
	router.post("/api/nm/v1/health", nmCheckAuth(), controller.v1.nmHealth.createOne); // 创建一条，并返回id
	router.post("/api/nm/v1/health/upload/cover", nmCheckAuth(), controller.v1.upload.uploadHealthCover); // 上传封面

	router.post("/api/nm/v1/health/upload", nmCheckAuth(), controller.v1.upload.uploadHealth); // 上传其他资源

	router.put("/api/nm/v1/health/draft", nmCheckAuth(), controller.v1.nmHealth.saveAsDraft); // 保存为草稿
	router.put("/api/nm/v1/health/article", nmCheckAuth(["r", "A"]), controller.v1.nmHealth.saveAsArticle); // 保存为发布文章
	router.get("/api/nm/v1/health", nmCheckAuth(), controller.v1.nmHealth.getInfoToEdite); // 获取一条文章详细信息用于编辑
	router.put("/api/nm/v1/health/status", nmCheckAuth(["r", "A"]), controller.v1.nmHealth.changeStatus); // 修改文章的状态，录入员不允许修改
	router.delete("/api/nm/v1/health", nmCheckAuth(["r", "A"]), controller.v1.nmHealth.deleteOne); // 根据id删除一条文章

	router.get("/api/nm/v1/classfications", nmCheckAuth(), controller.v1.nmHealthClassification.getAll); // 列表
	router.post("/api/nm/v1/classfication", nmCheckAuth(), controller.v1.nmHealthClassification.createOne); // 创建
	router.put("/api/nm/v1/classfication", nmCheckAuth(), controller.v1.nmHealthClassification.updateOne); // 更新
	router.delete("/api/nm/v1/classfication", nmCheckAuth(), controller.v1.nmHealthClassification.deleteOne); // 删除

};
