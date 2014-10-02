var path = require('path');

var should = require('should');

var tickets = require('../lib/tickets');

describe('Tickets', function() {

	describe('#simple', function() {

		it('should find no tickets', function(done) {

			tickets({
				dir: path.resolve('test', 'fixtures', 'none')

			}, function(err, issues) {
				err.should.equal('No issues found');

				done();
			});

		});

		it('should find all tickets', function(done) {

			tickets({
				dir: path.resolve('test', 'fixtures', 'all')

			}, function(err, issues) {

				if (err) {
					throw err;
				}

				issues.should.be.an.Array;
				issues.should.have.a.lengthOf(3);

				issues[0].should.be.an.Object;
				issues[0].should.have.properties({
					key: 'TIMOB-17663',
					files: {
						'/foo.js': [1]
					}
				});
				issues[0].fields.should.be.an.Object;

				issues[1].should.be.an.Object;
				issues[1].should.have.properties({
					key: 'ALOY-1134',
					files: {
						'/foo.js': [5]
					}
				});
				issues[1].fields.should.be.an.Object;

				issues[2].should.be.an.Object;
				issues[2].should.have.properties({
					key: 'ALOY-999999',
					files: {
						'/foo.js': [9]
					},
					error: 'Request to Jira for issue "ALOY-999999" failed with: 404.'
				});

				done();
			});

		});

	});

});