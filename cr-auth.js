angular.module('cr.auth', [])
.service('crAuthBasic', [function() {

    var _config = {
        username: "username",
        password: "password"
    };

    var base64_decode = function(data) {
        var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
            ac = 0,
            dec = '',
            tmp_arr = [];

        if (!data) {
            return data;
        }

        data += '';

        do { // unpack four hexets into three octets using index points in b64
            h1 = b64.indexOf(data.charAt(i++));
            h2 = b64.indexOf(data.charAt(i++));
            h3 = b64.indexOf(data.charAt(i++));
            h4 = b64.indexOf(data.charAt(i++));

            bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

            o1 = bits >> 16 & 0xff;
            o2 = bits >> 8 & 0xff;
            o3 = bits & 0xff;

            if (h3 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1);
            } else if (h4 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1, o2);
            } else {
            tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
            }
        } while (i < data.length);

        dec = tmp_arr.join('');

        return dec.replace(/\0+$/, '');
    };

    var base64_encode = function(data) {
        var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        enc = '',
        tmp_arr = [];

        if (!data) {
        return data;
        }

        do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1 << 16 | o2 << 8 | o3;

        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);

        enc = tmp_arr.join('');

        var r = data.length % 3;

        return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
    };

    /**
     * Override Configuration
     * @param conf Object
     */
    this.setConfig = function(conf) {
        _config.concat(conf);
    };

    /**
     * sign the request.
     * @param request
     */
    this.getSign = function(request, identity) {
        if(!identity){
            identity = {};
            identity[_config.username] = "";
            identity[_config.password] = "";
        }
        request.headers['Authorization'] = 'Basic ' + base64_encode(identity[_config.username] + ":" +identity[_config.password]);
        console.log("sto usando questa auth", request.headers);
        return request;
    };
}])
.provider("crAuth", function(){
    var authHandler;
    
    this._providers = [];
    
    this.restrictProvidersTo = function(providers) {
        this._providers = providers;
    };

    this.$get = ["crAuthService", function(crAuthService){
        var service = crAuthService.build(this.authHandler);
        service.restrictProvidersTo(this._providers);
        return service;
    }];
})
.service("crAuthService", ['$rootScope', function($rootScope) {

    var authHandler;
    var sessionHandler;
    this._providers = [];
    
    var self = this;

    self.build = function(a) {
        self.authHandler = a;
        return self;
    };

    self.setAuthHandler = function(a) {
        self.authHandler = a;
    };
    
    
    self.restrictProvidersTo = function(providers) {
      self._providers = providers;  
    };

    /**
     * Clean signature
     */
    self.purge = function() {
        self.getSessionHandler().set('identity', null, "cr-auth");
    };

    self.setSessionHandler = function(s) {
        self.sessionHandler = s;
    };

    self.getSessionHandler = function() {
        return self.sessionHandler;
    };

    self.getAuthHandler = function() {
        return self.authHandler;
    };

    self.setIdentity = function(identity)
    {
        self.getSessionHandler().set('identity', identity, "cr-auth");
    };

    self.getIdentity = function()
    {
        return self.getSessionHandler().get('identity', "cr-auth");
    };

    self.sign = function(request){
        return self.getAuthHandler().getSign(request, self.getIdentity());
    };
    
    

    $rootScope.$on('cr-auth:identity:login:success', function(event, data) {
        console.log("providers abilitati", self._providers);
        if(self._providers.length === 0 || (self._providers.length && self._providers.indexOf(data.provider) !== -1)) {
            self.purge();
            console.log("SONO IN AUTH E IL PROVIDER e': ", data.provider, self._providers);
            self.setIdentity(data);
            $rootScope.$broadcast('cr-auth:identity:ready:success', self);
        }
    });
    

    return self;
}]);