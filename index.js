var rest = require('restler')
  , _    = require('lodash')
  , q    = require('q')
;

module.exports = {
    /**
     * This optional function is called every time before the module executes.  It can be safely removed if not needed.
     *
     */
    init: function() {
    }
    /**
     * run
     *
     * @param {WFDataStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {WFDataParser} dexter Container for all data used in this workflow.
     */
    , run: function(step, dexter) {
        var exclude_nonmember = step.input('exclude_nonmember').first()
          , exclude_archived  = step.input('exclude_archived').first()
          , provider    = dexter.provider('slack')
          , botToken    = provider.data('bot.bot_access_token')
          , isBot       = !!botToken //operate as the bot if we don't have a different username and we have a bot token
          , accessToken =  botToken || provider.credentials('access_token')
          , url         = 'https://slack.com/api/channels.list'
          , groups_url  = 'https://slack.com/api/groups.list'
          , self        = this
          , data        = {
              exclude_archived: exclude_archived || 1
              , token    : accessToken
          }
        ;

        console.log(data);

        q.all([this.send(data, url), this.send(data, groups_url)])
           .then(function(results) {
               var channels = results[0].channels
                 , groups   = results[1].groups
               ;

               if(exclude_nonmember) {
                   self.complete(groups.concat(_.where(channels, { is_member: true })));
               } else {
                   groups.concat(self.complete(channels));
               }
           })
           .catch(function(err) {
               self.fail(err);
           });
   }
   , send: function(data, url) {
        var deferred = q.defer();
        rest.post(url, {data:data}).on('complete', function(result, response) {
            if(result instanceof Error) {
                return deferred.reject(result.stack || result);
            }
            if(response.statusCode !== 200) {
                return deferred.reject({
                    message: 'Error Result From Slack',
                    code: response.statusCode,
                    postData: data 
                });
            }
            return deferred.resolve(_.merge(
                _.isObject(result) ? result : { result: result }
                , data
            ));
        });
        return deferred.promise;
   }
};
