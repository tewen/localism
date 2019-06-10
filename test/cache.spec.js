const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs-extra');

const { defaultFileNameGenerator, simpleCache } = require('../');

chai.use(require('sinon-chai'));
const { expect } = chai;

describe('cache', function () {
  describe('defaultFileNameGenerator()', function () {
    it('should return \'no-parameters\' if there are no parameters provided', function () {
      expect(defaultFileNameGenerator()).to.equal('no-parameters');
    });

    it('should specify a single primitive value as it is', function () {
      expect(defaultFileNameGenerator('someString')).to.equal('someString');
      expect(defaultFileNameGenerator(545)).to.equal('545');
      expect(defaultFileNameGenerator(true)).to.equal('true');
    });

    it('should separate multiple primitive values with double underscores', function () {
      expect(defaultFileNameGenerator(1, 'otherPrimitive', undefined, 22)).to.equal('1__otherPrimitive__undefined__22');
    });

    it('should map all properties for an object that has five or less', function () {
      expect(defaultFileNameGenerator({
        red: true,
        green: 55,
        blue: 'hello'
      })).to.equal('blue=hello&green=55&red=true');
    });

    it('should map out the first five properties of any object', function () {
      expect(defaultFileNameGenerator({
        a: true,
        a2: false,
        blue: 'hello',
        green: 55,
        red: true,
        yellow: 34
      })).to.equal('a=true&a2=false&blue=hello&green=55');
    });

    it('should separate multiple objects with double underscores', function () {
      expect(defaultFileNameGenerator({
        a: true,
        a2: false,
        blue: 'hello',
        green: 55,
        red: true,
        yellow: 34
      }, {
        red: true,
        green: 55,
        blue: 'hello'
      })).to.equal('a=true&a2=false&blue=hello&green=55__blue=hello&green=55&red=true');
    });

    it('should be able to mix objects and primitives and remove spaces from the final version', function () {
      expect(defaultFileNameGenerator({
          a: true,
          a2: false,
          blue: 'hello',
          green: 55,
          red: true,
          yellow: 34
        },
        'Lemmy Kilmister', {
          red: true,
          green: 55,
          blue: 'hello'
        })).to.equal('a=true&a2=false&blue=hello&green=55__LemmyKilmister__blue=hello&green=55&red=true');
    });

    it('should specify arrays as array-${array.length}', function () {
      expect(defaultFileNameGenerator(
        [1, 2, 3, 4, 5],
        'Lemmy Kilmister', {
          red: true,
          green: 55,
          blue: 'hello'
        })).to.equal('array-5__LemmyKilmister__blue=hello&green=55&red=true');
    });

    it('should be able to mix primitives, objects, and arrays', function () {
      expect(defaultFileNameGenerator([])).to.equal('array-0');
    });

    it('should specify sub-objects as object-${Object.keys(object).length}', function () {
      expect(defaultFileNameGenerator({
        a: {
          red: 1,
          green: 2
        },
        a2: false,
        blue: [1, 2, 3, 4],
        green: 55,
        red: true,
        yellow: 34
      })).to.equal('a=object-2&a2=false&blue=array-4&green=55');
    });
  });

  describe('simpleCache()', function () {
    afterEach(async function () {
      if (await fs.exists('cache')) {
        await fs.remove('cache');
      }
      if (await fs.exists('altCache')) {
        await fs.remove('altCache');
      }
    });

    it('should return null if not passed a function', function () {
      expect(simpleCache()).to.be.null;
    });

    it('should return a function if passed a function', function () {
      expect(simpleCache({ fn: sinon.spy() })).to.be.an.instanceOf(Function);
    });

    it('should call the function with the same arguments passed in if no file exists with the cached info', async function () {
      const fn = sinon.stub().resolves({ red: 55 });
      const cachedFn = simpleCache({ fn });
      expect(await cachedFn(1, 2, 3)).to.eql({ red: 55 });
    });

    it('should write the response from the function call to a file', async function () {
      const fn = sinon.stub().resolves({ blue: 'LL' });
      const cachedFn = simpleCache({ fn });
      await cachedFn(5, 6, 7);
      expect(await fs.exists('cache/5__6__7')).to.be.true;
      expect(await fs.readFile('cache/5__6__7', 'utf-8')).to.equal('{"blue":"LL"}');
    });

    it('should be able to write cached files to another directory than the default cache directory', async function () {
      const fn = sinon.stub().resolves({ green: true });
      const cachedFn = simpleCache({
        fn,
        cacheDirectoryPath: 'altCache/secondLevel'
      });
      await cachedFn({
        one: 1,
        two: 2
      });
      expect(await fs.exists('altCache/secondLevel/one=1&two=2')).to.be.true;
      expect(await fs.readFile('altCache/secondLevel/one=1&two=2', 'utf-8')).to.equal('{"green":true}');
    });

    it('should return future calls with the same arguments from the cache', async function () {
      const fn = sinon.stub().resolves({ red: 55 });
      const cachedFn = simpleCache({ fn });
      expect(await cachedFn('tiny', 'tim')).to.eql({ red: 55 });
      expect(await cachedFn('tiny', 'tim')).to.eql({ red: 55 });
      expect(fn).to.have.been.calledOnce;
    });

    it('should be able to send in a custom transformFromFile method', async function () {
      const fn = sinon.stub().resolves({ red: 55 });
      const cachedFn = simpleCache({
        fn,
        transformFromFile: sinon.stub().returns({ red: 'modified' })
      });
      expect(await cachedFn('tiny', 'ted')).to.eql({ red: 55 });
      expect(await cachedFn('tiny', 'ted')).to.eql({ red: 'modified' });
    });

    it('should be able to send in a custom fileNameGenerator method', async function () {
      const fn = sinon.stub().resolves({ red: 88 });
      const fileNameGenerator = sinon.stub().returns('my-file-name-that-is-special');
      const cachedFn = simpleCache({ fn, fileNameGenerator });
      await cachedFn([6, 'Koolaid']);
      expect(await fs.exists('cache/my-file-name-that-is-special')).to.be.true;
      expect(await fs.readFile('cache/my-file-name-that-is-special', 'utf-8')).to.equal('{"red":88}');
    });

    it('should be able to do a uuid based file name', async function () {
      const fn = sinon.stub().resolves({ red: 99 });
      const cachedFn = simpleCache({ fn, uuidFileName: true });
      await cachedFn([6, 'Koolaid', false]);
      expect((await fs.readdir('cache')).length).to.eql(1);
    });
  });
});
