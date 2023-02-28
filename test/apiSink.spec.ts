// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="../node_modules/@types/jest/index.d.ts" />
/// <reference path="../node_modules/typemoq/dist/typemoq.d.ts" />

import {expect} from 'chai';
import {APISink} from '../src/apiSink';


describe('APISink', () => {
    it('should throw if options are missing', () => {
        expect(() => new APISink(null)).to.throw();
    });

    it('should strip trailing slash from the provided URL', () => {
        const sink = new APISink({url: 'https://test/'});
        expect(sink.url).to.equal('https://test');
    })
});