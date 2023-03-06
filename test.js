const chai = require('chai');
const expect = chai.expect;

const Southernrail = require('./index.js');
const southernrail = new Southernrail();

describe('Method Tests', function () {
  this.timeout(5500);
  this.slow(3000);

  it('getShortName', async () => {
    const Output = await southernrail.getShortName('London Victoria');
    expect(Output).to.be.an('string');
    expect(Output).to.be.equal('VIC');
  });

  it('getLongName', async () => {
    const Output = await southernrail.getLongName('HUR');
    expect(Output).to.be.an('string');
    expect(Output).to.be.equal('Hurst Green');
  });

  it('searchStops', async () => {
    const Output = await southernrail.searchStops('London Victoria');
    expect(Output).to.be.an('array');
    expect(Output).to.have.lengthOf(1);
    expect(Output[0]).to.have.contain('London Victoria').that.is.a('string');
  });

  it('getDepartures', async () => {
    const { response } = await southernrail.getDepartures('Hurst Green');
    expect(response).to.be.an('object');
    expect(response).to.have.property('locationName').that.is.a('string').that.is.eql('Hurst Green');
    expect(response).to.have.property('services').that.is.an('array');
  });

  it('getRideDetails', async () => {
    const { response } = await southernrail.getDepartures('Hurst Green');
    const ride_response = await southernrail.getRideDetails(response.services[0].ridKey);
    const { GetServiceDetailsResult } = ride_response.response;
    expect(GetServiceDetailsResult).to.be.an('object');
    expect(GetServiceDetailsResult).to.have.property('ridKey').that.is.a('string')
    expect(GetServiceDetailsResult).to.have.property('trainid').that.is.a('string')
    expect(GetServiceDetailsResult).to.have.property('locations').that.is.an('object').to.have.property('location').that.is.an('array').that.has.lengthOf.above(0);
  });
});