//
// fcns related to Diffie-Hellman encryption
//
var common = require('./common');
var ethUtils = require('ethereumjs-util');
var ethtx = require('ethereumjs-tx');
var ethabi = require('ethereumjs-abi');
var Buffer = require('buffer/').Buffer;
var crypto = require("crypto");
var BN = require("bn.js");
const keccak = require('keccakjs');

var dhcrypt = module.exports = {

    dh: null,
    //this Prime is from the 2048-bit MODP group from RFC 3526
    PRIME_2048: 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A0\
8798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE38\
6BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C6\
2F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5\
C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF',

    initDH: function(cb) {
	//The DH algorithm begins with a large prime, P, and a generator, G. These don't have to be secret, and they may be
	//transmitted over an insecure channel. The generator is a small integer and typically has the value 2 or 5.
	//we use a known safe prime and generator.
	var primeBN = new BN(dhcrypt.PRIME_2048, 16);
	var dh = crypto.createDiffieHellman(primeBN.toString(16), 'hex');
	console.log('dhcrypt:prime: ' + dh.getPrime('hex'));
	console.log('dhcrypt:generator: ' + dh.getGenerator('hex'));
	privateKeyFromAcct(function(privateKey) {
	    //console.log('privateKey: ' + privateKey);
	    if (privateKey.startsWith('0x'))
		privateKey = privateKey.substring(2);
	    dh.setPrivateKey(privateKey, 'hex');
	    dh.generateKeys('hex');
	    console.log('dhcrypt:private (' + dh.getPrivateKey('hex').length + '): ' + dh.getPrivateKey('hex'));
	    var publicKey = dh.getPublicKey('hex');
	    console.log('dhcrypt:public: (' + publicKey.length + '): ' + publicKey);
	    dhcrypt.dh = dh;
	    cb();
	});
    },

    publicKey: function() {
	var publicKey = dhcrypt.dh.getPublicKey('hex');
	//console.log('dhcrypt:publicKey: ' + publicKey);
	return(publicKey);
    },

};


// generate a diffie hellman secret
// we auto-generate the secret by signing an arbitrary message with the user's private key. the important point
// is that the word is generated deterministically (so that we can re-generate it whenever we want). the secret
// should never be shared or even stored anywhere at all.
//
function privateKeyFromAcct(cb) {
    var msg = "This is an arbitrary message. By signing it you will create a diffie-hellman secret.\n\n\
He no longer dreamed of storms, nor of women, nor of great occurrences, nor of great fish, nor fights, \
nor contests of strength, nor of his wife. He only dreamed of places now and of the lions on the beach.";
    var hexMsg = ethUtils.bufferToHex(msg);
    //console.log('hexMsg: ' + hexMsg.toString());
    common.web3.personal.sign(hexMsg, common.web3.eth.accounts[0], function(err, signature) {
	if (!!err) {
	    console.log('secretFromAcct: error signing arbitrary message. err = ' + err);
	    alert('Unable to generate secret: ' + err);
	    cb(null);
	} else {
	    //signature is 65 bytes (520 bits)
	    //console.log('signature: ' + signature);
	    //console.log('length: ' + signature.length);
	    cb(signature);
	}
    });
}
