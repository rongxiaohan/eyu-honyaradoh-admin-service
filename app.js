
"use strict";

module.exports = class AppBook {
	/**
     *
	 * @param {Egg.Application} app eggApp
     */
	constructor(app) {
		this.app = app;
		this.app.running = true;
	}

	async willReady() {
		//
	}

	async serverDidReady() {
		process.on("SIGINT", signal => {
			console.log("SIGINT", signal);
			this.app.running = false;
		});
		process.on("SIGTERM", signal => {
			console.log("SIGTERM", signal);
			this.app.running = false;
		});
	}

	async beforeClose() {
		//
	}
};
