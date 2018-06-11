define({
    "api": [
        {
            "type": "get",
            "url": "/api/service",
            "title": "Request information about a specific service",
            "name": "FetchService",
            "group": "Service",
            "parameter": {
                "fields": {
                    "Parameter": [
                        {
                            "group": "Parameter",
                            "type": "String",
                            "optional": false,
                            "field": "name",
                            "description": "<p>The services unique name</p>"
                        }
                    ]
                }
            },
            "success": {
                "fields": {
                    "Success 200": [
                        {
                            "group": "Success 200",
                            "type": "JSON",
                            "optional": false,
                            "field": "service",
                            "description": "<p>The service data including sessions</p>"
                        }
                    ]
                }
            },
            "version": "0.0.0",
            "filename": "src/index.js",
            "groupTitle": "Service"
        },
        {
            "type": "get",
            "url": "/api/sessions",
            "title": "Request session information about a service",
            "name": "FetchSessions",
            "group": "Sessions",
            "parameter": {
                "fields": {
                    "Parameter": [
                        {
                            "group": "Parameter",
                            "type": "String",
                            "optional": false,
                            "field": "name",
                            "description": "<p>The name of the service</p>"
                        }
                    ]
                }
            },
            "success": {
                "fields": {
                    "Success 200": [
                        {
                            "group": "Success 200",
                            "type": "JSON",
                            "optional": false,
                            "field": "sessions",
                            "description": "<p>The session data for the service</p>"
                        }
                    ]
                }
            },
            "version": "0.0.0",
            "filename": "src/index.js",
            "groupTitle": "Sessions"
        },
        {
            "type": "post",
            "url": "/api/sessions",
            "title": "Add a new session to a particular service",
            "name": "RecordSession",
            "group": "Sessions",
            "parameter": {
                "fields": {
                    "Parameter": [
                        {
                            "group": "Parameter",
                            "type": "String",
                            "optional": false,
                            "field": "name",
                            "description": "<p>The name of the service this session is for</p>"
                        },
                        {
                            "group": "Parameter",
                            "type": "String",
                            "optional": false,
                            "field": "sessionData",
                            "description": "<p>The data the session has to record</p>"
                        },
                        {
                            "group": "Parameter",
                            "type": "String",
                            "optional": false,
                            "field": "token",
                            "description": "<p>The auth token optionally required by the service to record the session</p>"
                        }
                    ]
                }
            },
            "version": "0.0.0",
            "filename": "src/index.js",
            "groupTitle": "Sessions"
        }
    ]
});
