module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        compress: {
            options: {
                mode: 'gzip'
            },
            css: {
                files: [
                    {
                        expand: true,
                        cwd: "C:/xampp/htdocs/mercado/css",
                        src: ["**/*.css"],
                        dest: "C:/xampp/htdocs/mercado/comprimidos"
                    }
                ]
            },
            html: {
                files: [
                    {
                        expand: true,
                        cwd: "C:/xampp/htdocs/mercado",
                        src: ["**/*.html"],
                        dest: "C:/xampp/htdocs/mercado/comprimidos"
                    }
                ]
            },
            js: {
                files: [
                    {
                        expand: true,
                        cwd: "C:/xampp/htdocs/mercado/js",
                        src: ["**/*.js"],
                        dest: "C:/xampp/htdocs/mercado/comprimidos"
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-compress");

    grunt.registerTask("default", ["compress"]);
};