define({
    "api": [
        {
            "type": "get",
            "url": "/api/service",
            "title": "Fetch Service",
            "description": "<p>Request information about a specific service</p>",
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
            "groupTitle": "Service",
            "name": "GetApiService"
        },
        {
            "type": "get",
            "url": "/api/sessions",
            "title": "Fetch Sessions",
            "description": "<p>Request session information about a service</p>",
            "group": "Sessions",
            "permission": [
                {
                    "name": "auth",
                    "title": "Authorized use only",
                    "description": "<p>Only authorized users may use this endpoint</p>"
                }
            ],
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
            "groupTitle": "Sessions",
            "name": "GetApiSessions"
        },
        {
            "type": "post",
            "url": "/api/sessions",
            "title": "Record Session",
            "description": "<p>Add a new session to a particular service</p>",
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
            "groupTitle": "Sessions",
            "name": "PostApiSessions"
        }
    ]
});
