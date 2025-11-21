import stripCode from 'rollup-plugin-strip-code';
import typescript from 'rollup-plugin-typescript2';

export default [
	{
		input: 'src/index.ts',
		output: {
			file: 'dist/serilogger.es6.js',
			format: 'es',
			name: 'serilogger',
			sourcemap: true
		},
		plugins: [typescript()]
	}, 
	{
		input: 'src/index.ts',
		output: {
			file: 'dist/serilogger.js',
			format: 'umd',
			name: 'serilogger',
			sourcemap: true
		},
		plugins: [
			typescript(),
			stripCode({
				start_comment: 'start_test_code',
				end_comment: 'end_test_code'
			})
		]
	}
];
