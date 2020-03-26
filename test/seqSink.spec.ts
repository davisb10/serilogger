// <reference path="../node_modules/@types/node/index.d.ts" />
/// <reference path="../node_modules/@types/jest/index.d.ts" />
/// <reference path="../node_modules/typemoq/dist/typemoq.d.ts" />

import {expect} from 'chai';
import {SeqSink} from '../src/seqSink';


describe('SeqSink', () => {
    it('should throw if options are missing', () => {
        expect(() => new SeqSink(null)).to.throw();
    });

    it('should strip trailing slash from the provided URL', () => {
        const sink = new SeqSink({url: 'https://test/'});
        expect(sink.url).to.equal('https://test');
    })
});