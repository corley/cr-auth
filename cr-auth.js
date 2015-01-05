angular.module('cr.auth', [])
.service('crAuthBasic', [function() {

    var _credentials = {};

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
     * Override credentials
     * @param credentials Object
     */
    this.setCredentials = function(credentials) {
    	_credentials = credentials;
    };
    
    /**
     * Void credentials
     * @param conf Object
     */
    this.voidCredentials = function() {
        _credentials = {};
    };

    /**
     * sign the request.
     * @param request
     */
    this.getSign = function(request/*, identity*/) {
//        if(!identity){
//            identity = {};
//            identity[_config.username] = "";
//            identity[_config.password] = "";
//        }
        if(_credentials.username && _credentials.password && request.headers) {
        	request.headers['Authorization'] = 'Basic ' + base64_encode(_credentials.username + ":" + _credentials['password']);
        }
        else {
        	if(request.headers) {
        		delete request.headers['Authorization'];
        	}
        }
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
        var service = crAuthService.createService(this.authHandler);
        service.restrictProvidersTo(this._providers);
        return service;
    }];
})
.service("crAuthService", ['$rootScope', function($rootScope) {

    var authHandler;
    var sessionHandler;
    this._providers = [];
    
    var self = this;

    self.createService = function(a) {
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
    
    self.purgeIdentity = function()
    {
        return self.getSessionHandler().purgeNamespace("cr-auth");
    };

    self.sign = function(request){
        return self.getAuthHandler().getSign(request, self.getIdentity());
    };
    
    

    $rootScope.$on('auth:login:success', function(event, data) {
    	if(self._providers.length === 0 || (self._providers.length && self._providers.indexOf(data.provider) !== -1)) {
    		//self.purgeIdentity();
    		self.setIdentity(data);
    		if(self.getAuthHandler()) {
    			self.getAuthHandler().setCredentials(data.auth);
    		}
    		$rootScope.$broadcast('auth:identity:success', self);
    	}
    });
    
    $rootScope.$on('auth:logout:success', function(event, data) {
        self.purgeIdentity();
		if(self.getAuthHandler()) {
			self.getAuthHandler().voidCredentials();
		}
        $rootScope.$broadcast('auth:purge:success', self);
    });
    

    return self;
}])
.directive('googleSignin', ['$rootScope', function($rootScope) {
  return {
    restrict: 'A',
    template: '<span id="signinButton"></span>',
    replace: true,
    scope: {
      afterSignin: '&'
    },
    link: function(scope, ele, attrs) {
      // Set standard google class
      attrs.$set('class', 'g-signin');
      
      console.log("attrs", attrs);
      // Set the clientid
      attrs.$set('data-clientid', 
          attrs.clientId+'.apps.googleusercontent.com');
      // build scope urls
      var scopes = attrs.scopes || [
        'auth/plus.login', 
        'auth/userinfo.email'
      ];
      var scopeUrls = [];
      for (var i = 0; i < scopes.length; i++) {
        scopeUrls.push('https://www.googleapis.com/' + scopes[i]);
      }

      // Create a custom callback method
      var callbackId = "_googleSigninCallback",
          directiveScope = scope;
      window[callbackId] = function() {
        var oauth = arguments[0];
        if(directiveScope.afterSignin) {
            directiveScope.afterSignin({oauth: oauth});
        }
        window[callbackId] = null;
        $rootScope.$broadcast("auth:login:success", {"provider":"google", "auth": oauth});
      };

      // Set standard google signin button settings
      attrs.$set('data-callback', callbackId);
      attrs.$set('data-cookiepolicy', 'single_host_origin');
      attrs.$set('data-requestvisibleactions', 'http://schemas.google.com/AddActivity');
      attrs.$set('data-scope', scopeUrls.join(' '));

      // Finally, reload the client library to 
      // force the button to be painted in the browser
      (function() {
       var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
       po.src = 'https://apis.google.com/js/client:plusone.js';
       var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
      })();
    }
  };
}])
;