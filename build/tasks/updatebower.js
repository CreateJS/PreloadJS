module.exports = function (grunt) {

	grunt.registerMultiTask('updatebower', function() {
		var data = this.data;
		var file = data.file;
		var version = data.version;

		if (!grunt.file.exists(file)) {
			grunt.log.error(file+' not found.');
			return;
		}

		var contents = grunt.file.read(file);
		var pattern = /(["-])\d\.\d\.\d|NEXT(\1|\.)/g; // Matches -#.#.#. OR "#.#.#"
		var contents = contents.replace(pattern, "$1"+version+"$2");
		grunt.file.write(file, contents);
	});

}
