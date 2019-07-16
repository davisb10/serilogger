import typescript from 'rollup-plugin-typescript2';

export default [{
  input: 'src/index.ts',
  output: {
    file: 'dist/serilogger.es6.js',
    format: 'es',
    name: 'serilogger',
    sourcemap: true
  },
  plugins: [typescript({
    target: 'es6',
    typescript: require('typescript')
  })]
}, {
  input: 'src/index.ts',
  output: {
    file: 'dist/serilogger.js',
    format: 'umd',
    name: 'serilogger',
    sourcemap: true
  },
  plugins: [typescript({
    target: 'es5',
    typescript: require('typescript')
  })]
}];
