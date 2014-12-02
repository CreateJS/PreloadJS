module.exports = function (grunt) {
	grunt.initConfig(
		{
			pkg: grunt.file.readJSON('package.json'),

			jasmine: {
				run: {
					src: [
						'../lib/preloadjs-0.4.1.combined.js'
					],
					options: {
						specs: 'spec/*Spec.js',
						helpers: []
					}
				}
			},

			connect: {
				server: {
					options: {
						keepalive: true,
						base: ['../_assets/', '../lib/', '../', './'],
						middleware: function (connect, options, middlewares) {
							middlewares.unshift(function echo(req, res, next) {
								if (req.method == "POST") {
									res.end(JSON.stringify(req.body));
								} else {
									next();
								}
							});

							var bodyParser = require('body-parser')
							middlewares.unshift(bodyParser.json());
							middlewares.unshift(bodyParser.urlencoded({
							  extended: true
							}));

							return middlewares;
						},
					}
				}
			},

			findopenport: {
				connect: {
					options: {
						ports: [8000, 8888, 9000, 9999, 9001, 8001],
						configName: "connect.server.options.port"
					}
				}
			},

			listips: {
				run: {
					options: {
						port: "<%=connect.server.options.port %>",
						label: "Normal"
					}
				}
			}
		}
	);

	// Load all the tasks we need
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadTasks('tasks/');

	grunt.registerTask("default", ["findopenport", "listips", "connect"]);
};
