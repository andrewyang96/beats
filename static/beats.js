function containsType(types, name)
{
    for (var typeIndex = 0; typeIndex < types.length; typeIndex++)
    {
        if (types[typeIndex] == name)
        {
            return true;
        }
    }
    return false;
}

function roundDbValue(level)
{
    var negLevel = level < 0.0;
    var absLevel = negLevel ? -level : level;
    return (negLevel ? -0.1 : 0.1) * Math.floor(absLevel * 10.0 + 0.5);
}

angular.module('Beats.filters', [])

// A filter that takes a number of seconds and converts it to MM:SS format
.filter('momentFormat', function()
{
    return function(input)
    {
        var seconds = (Math.floor(input) % 60);
        if (seconds < 10)
        {
            seconds = '0' + seconds;
        }
        return Math.floor(input / 60) + ':' + seconds;
    };
})

// A filter that takes a given frequency and converts it into Hz or kHz with
// the appropriate label
.filter('freqFormat', function()
{
    return function(input)
    {
        var unit = 'Hz';
        var value = input;
        if (input > 999.5)
        {
            unit = 'kHz';
            value /= 1000.0;
        }
        return Math.floor(value + 0.5) + ' ' + unit;
    };
})

// A filter that rounds a dB level (the same way as how the rounding is done in
// roundDbValue) and appends a 'dB' label
.filter('dbFormat', function()
{
    return function(input)
    {
        var negInput = input < 0.0;
        var absInput = negInput ? -input : input;

        var multInput = Math.floor(absInput * 10.0 + 0.5);
        var tenth = multInput % 10;
        var whole = Math.floor(multInput / 10);

        return (negInput ? '-' : '') + whole + '.' + tenth + ' dB';
    };
});

angular.module('BeatsApp', ['Beats.filters', 'ngCookies'])
.directive('takeFocus', function($timeout)
{
    // Directive used to focus on an element when the variable under takeFocus becomes true
    return {
        link: function(scope, element, attrs)
        {
            // Watch the variable under takeFocus
            scope.$watch(attrs.takeFocus, function(value)
            {
                // We should take focus to this element
                if (value === true)
                {
                    // A tiny timeout is required for the element to be rendered and be able to take
                    // focus
                    $timeout(function()
                    {
                        element[0].focus();
                        // Reset the focus variable so this action can be repeated
                        scope[attrs.takeFocus] = false;
                    });
                }
            });
        }
    };
})
.directive('barControl', function()
{
    // Directive for having bar slider based input controls
    return {
        link: function(scope, element, attrs)
        {
            // Get the parameters that determine how to set the value
            var barMin = attrs.barMin | 0;
            var barMax = attrs.barMax | 0;
            var barOrientation = attrs.barOrientation;
            var barUseParentScope = attrs.barUseParentScope;
            var useParent = barUseParentScope == 'true';
            var scopeToUse = useParent ? scope.$parent : scope;

            var dragging = false;

            var handleDragging = function(event)
            {
                if (dragging)
                {
                    // Prevent browser's default dragging behaviour
                    event.preventDefault();

                    // Determine ratio from 0 to 1 over the control
                    var ratio;
                    if (barOrientation == 'vertical')
                    {
                        ratio = 1.0 - (event.clientY - element[0].offsetTop) / (element[0].offsetHeight);
                    }
                    else
                    {
                        ratio = (event.clientX - element[0].offsetLeft) / (element[0].offsetWidth);
                    }
                    console.log(ratio);

                    // Linearly map that ratio to between barMax and barMin
                    scopeToUse[attrs.barControl] = ratio * (barMax - barMin) + barMin;
                    if (scopeToUse[attrs.barControl] < barMin)
                    {
                        scopeToUse[attrs.barControl] = barMin;
                    }
                    if (scopeToUse[attrs.barControl] > barMax)
                    {
                        scopeToUse[attrs.barControl] = barMax;
                    }

                    // Mouse move event hooks are optional (WARNING: The
                    // evaluated expression runs in this scope, never the
                    // parent!!!)
                    if (attrs.barOnMouseMove !== undefined) {
                        scope.$eval(attrs.barOnMouseMove);
                    }

                    // Update the view
                    scopeToUse.$digest();
                }
            };

            var finishDragging = function()
            {
                if (dragging)
                {
                    // Call the callback for whenever the bar is set
                    scopeToUse.$eval(attrs.barSet);
                    dragging = false;

                    // Indicate that dragging has stopped
                    scopeToUse[attrs.barDragging] = false;
                }
            };

            element[0].addEventListener('mousedown', function(event)
            {
                dragging = true;

                // Indicate that dragging has started
                scopeToUse[attrs.barDragging] = true;

                handleDragging(event);
            });

            element[0].addEventListener('mouseup', finishDragging);
            element[0].addEventListener('mouseleave', finishDragging);
            element[0].addEventListener('mousemove', handleDragging);
        }
    };
})
.directive('toggleSwitch', function()
{
    // Directive for having toggle slider based input switches
    return {
        link: function(scope, element, attrs)
        {
            // Get the parameters that determine how to set the value
            var toggleOrientation = attrs.toggleOrientation;

            var dragging = false;
            var mouseMoved = false;

            var handleDragging = function(event)
            {
                if (event === null)
                {
                    // Simply change the value of the toggle switch
                    scope[attrs.toggleSwitch] = !scope[attrs.toggleSwitch];
                }
                else if (dragging)
                {
                    // The mouse moved
                    mouseMoved = true;

                    // Prevent browser's default dragging behaviour
                    event.preventDefault();

                    // Determine ratio from 0 to 1 over the control
                    var ratio;
                    if (toggleOrientation == 'vertical')
                    {
                        ratio = 1.0 - (event.clientY - element[0].offsetTop) / (element[0].offsetHeight);
                    }
                    else
                    {
                        ratio = (event.clientX - element[0].offsetLeft) / (element[0].offsetWidth);
                    }

                    // Linearly map that ratio to between barMax and barMin
                    scope[attrs.toggleSwitch] = ratio >= 0.5;
                }

                // Update the view
                scope.$digest();
            };

            var finishDragging = function()
            {
                if (dragging)
                {
                    // Update toggle if we didn't move the mouse
                    if (!mouseMoved)
                    {
                        handleDragging(null);
                    }
                    mouseMoved = false;

                    // Call the callback for whenever the bar is set
                    scope.$eval(attrs.toggleSet);
                    dragging = false;

                    // Indicate that dragging has stopped
                    scope[attrs.toggleDragging] = false;
                }
            };

            element[0].addEventListener('mousedown', function(event)
            {
                dragging = true;

                // Indicate that dragging has started
                scope[attrs.toggleDragging] = true;
            });

            element[0].addEventListener('mouseup', finishDragging);
            element[0].addEventListener('mouseleave', finishDragging);
            element[0].addEventListener('mousemove', handleDragging);
        }
    };
})
.directive('dbTextDisplay', ['dbFormatFilter', function(dbFormatFilter)
{
    // Directive for having decibel label displays
    return {
        link: function(scope, element, attrs)
        {
            var dbTextIndex = attrs.dbTextIndex | 0;
            var dbTextUseParentScope = attrs.dbTextUseParentScope;
            var useParent = dbTextUseParentScope == 'true';
            var scopeToUse = useParent ? scope.$parent : scope;

            var updatePreampText = function()
            {
                element.text(dbFormatFilter(scopeToUse.eqPreampLevel));
            };

            var updateBandText = function()
            {
                element.text(dbFormatFilter(scopeToUse['bandLevel' + dbTextIndex]));
            };

            var updateText = function()
            {
                if (dbTextIndex == -1)
                {
                    updatePreampText();
                }
                else
                {
                    updateBandText();
                }
            };

            scopeToUse.$on('changeDbText', function(event, args)
            {
                // args.index has two special sentinel values:
                // 1) -1 means to update the text corresponding to the preamp,
                //    which means the label corresponding to the preamp setting
                //    should have a db-text-index value of -1.
                // 2) -2 means to update the text no matter what it is.  In the
                //    case of updating every single control (e.g., during a
                //    refresh operation), this sentinel value helps reduce the
                //    broadcast complexity from O(N^2) to O(N), where N is the
                //    number of bands.
                if (args.index == -2 || args.index == dbTextIndex)
                {
                    updateText();
                }
            });

            updateText();
        }
    };
}])
.directive('dragSong', function()
{
    // Directive for having bar slider based input controls
    return {
        scope:
        {
            dragSong: '='
        },
        link: function(scope, element, attrs)
        {
            var dragging = false;

            var handleDragStart = function(event)
            {
                dragging = true;
                element[0].style.opacity = 0.4;
                event.dataTransfer.effectAllowed = 'all';
                event.dataTransfer.setData('application/x-song+json', JSON.stringify(scope.dragSong));
            };

            var handleDragOver = function(event)
            {
                if (!dragging && containsType(event.dataTransfer.types, 'application/x-song+json'))
                {
                    element[0].classList.add('dragover');
                }
            };

            var handleDragLeave = function(event)
            {
                if (!dragging)
                {
                    element[0].classList.remove('dragover');
                }
            };

            var handleDragFinish = function(event)
            {
                dragging = false;
                element[0].style.opacity = 1.0;
            };

            element[0].addEventListener('dragstart', handleDragStart);
            element[0].addEventListener('dragover', handleDragOver);
            element[0].addEventListener('dragleave', handleDragLeave);
            element[0].addEventListener('dragend', handleDragFinish);
        }
    };
})
.directive('dropSong', function()
{
    // Directive for having things that can reieve songs
    return {
        link: function(scope, element, attrs)
        {
            var handleDragOver = function(event)
            {
                event.stopPropagation();
                if (containsType(event.dataTransfer.types, 'application/x-song+json'))
                {
                    element[0].classList.add('dragover');
                    // This indicates to the browser that the drag will work
                    event.preventDefault();
                }
            };

            var handleDragLeave = function(event)
            {
                element[0].classList.remove('dragover');
            };

            var handleDrop = function(event)
            {
                event.stopPropagation();
                element[0].classList.remove('dragover');
                var song = JSON.parse(event.dataTransfer.getData('application/x-song+json'));
                scope.$eval(attrs.dropSong, { 'song': song });
            };

            element[0].addEventListener('dragover', handleDragOver);
            element[0].addEventListener('dragleave', handleDragLeave);
            element[0].addEventListener('drop', handleDrop);
        }
    };
})
.controller('BeatsController', ['$scope', '$http', '$interval', '$cookies',
function($scope, $http, $interval, $cookies)
{
    //
    // Data
    //

    var backendBase = '/beats/1104'
    var authentication = true;

    $scope.showLoginDialog = false;
    $scope.formUsername = '';
    $scope.formPassword = '';
    $scope.showEqualizerDialog = false;
    $scope.showStreamDialog = false;
    $scope.formStreamURL = '';

    $scope.loggedIn = null;
    $scope.playlist = [];
    $scope.albumlist = [];
    $scope.queue = [];
    $scope.volume = 0;
    $scope.eqSupported = false;
    $scope.eqEnabled = false;
    $scope.eqPresets = [];
    $scope.eqPresetIndex = 0;
    $scope.eqPreampLevel = 0.0;
    $scope.eqBandFrequencies = [];
    $scope.holdVolumeUpdate = false;
    $scope.holdEqEnabledUpdate = false;
    $scope.holdEqPreampUpdate = false;
    $scope.playbackTime = 0;
    $scope.playbackDuration = 0;
    $scope.isPlaying = false;
    $scope.layout = 'songlist';
    $scope.defaultAlbumArt = 'static/default-album-art.jpg';

    $scope.sections =
    [
        { title: 'Queue', icon: '\uf03a', query: '' },
        { title: 'Recently Added', icon: '\uf017', query: '' },
        { title: 'Recently Played', icon: '\uf04b', query: 'play-history' },
        { title: 'Random', icon: '\uf074', query: '' },
        { title: 'Top 50', icon: '\uf01b', query: 'top-songs:50' },
    ];

    $scope.playlists =
    [
        { title: 'Rock' },
        { title: 'Pop' },
        { title: 'Top 40' },
        { title: 'Hardcore' },
        { title: 'Witch-Hop' },
    ];

    //
    // Utility Functions
    //

    $scope.isSongVotable = function(song)
    {
        for (var queueIndex = 0; queueIndex < $scope.queue.length; queueIndex++)
        {
            if ((song.id && $scope.queue[queueIndex]['id'] == song.id) ||
                (song.url && $scope.queue[queueIndex]['url'] == song.url)) {
                // Song is already playing
                if (queueIndex === 0) {
                    return false;
                }

                // Songs in the queue can not be voted for if the user has
                // already voted for them
                if ($scope.queue[queueIndex]['packet']['has_voted']) {
                    return false;
                }
            }
        }
        return true;
    };

    $scope.getSongIcon = function(song)
    {
        var playingIcon = '\uf028';
        var votedIcon   = '\uf00c';
        var voteIcon    = '\uf067';
        var waitingIcon = '\uf110';

        if ($scope.queue.length >= 1 &&
            (song.id && song.id == $scope.queue[0]['id'] ||
             song.url && song.url == $scope.queue[0]['url']))
        {
            return playingIcon;
        }

        for (var queueIndex = 0; queueIndex < $scope.queue.length; queueIndex++)
        {
            if (song.id && $scope.queue[queueIndex]['id'] == song.id &&
                $scope.queue[queueIndex]['packet']['has_voted'])
            {
                delete song.vote;
                return votedIcon;
            }

            if (song.url && $scope.queue[queueIndex]['url'] == song.url &&
                $scope.queue[queueIndex]['packet']['has_voted'])
            {
                delete song.vote;
                return votedIcon;
            }
        }

        if (song.vote)
        {
            return waitingIcon;
        }

        return voteIcon;
    };

    //
    // UI Functions
    //

    $scope.isShowingDialog = function()
    {
        return $scope.showLoginDialog || $scope.showEqualizerDialog || $scope.showStreamDialog || !!$scope.errorMessage;
    };

    $scope.startEqualizerDialog = function()
    {
        if (!$scope.ensureLogin())
        {
            return;
        }
        $scope.showEqualizerDialog = true;
        $scope.equalizerFocus = true;
    };

    $scope.hideEqualizerDialog = function()
    {
        $scope.showEqualizerDialog = false;
    };

    $scope.startStreamDialog = function()
    {
        if (!$scope.ensureLogin())
        {
            return;
        }
        $scope.formStreamURL = '';
        $scope.showStreamDialog = true;
        $scope.streamFocus = true;
    };

    $scope.hideStreamDialog = function()
    {
        $scope.showStreamDialog = false;
    };

    $scope.hideLoginDialog = function()
    {
        $scope.formUsername = '';
        $scope.formPassword = '';
        $scope.showLoginDialog = false;
    }

    $scope.ensureLogin = function()
    {
        if (!authentication)
        {
            return true;
        }

        if (!$cookies['crowd.token_key']) {
            $scope.showLoginDialog = true;
            $scope.usernameFocus = true;
            return false;
        }
        return true;
    };

    $scope.showSessionExpireMessage = function()
    {
        $scope.errorMessage = 'Your session has expired. Please login again.';
    };

    $scope.showErrorMessage = function()
    {
        $scope.errorMessage = 'An error has occurred.';
    };

    $scope.addToPlayList = function(playlist, song)
    {
        // Add the song to the given playlist
        console.log(playlist.title + ' <- ' + song.title);
    };

    //
    // Requests
    //

    // Wraps a POST request done by an authenticated user
    $scope.userRequest = function(endpoint, data)
    {
        if (!$scope.ensureLogin()) {
            return false;
        }

        if (!data)
        {
            data = '';
        }

        $http({
            method: 'POST',
            url: backendBase + endpoint,
            data: 'token=' + $cookies['crowd.token_key'] + '&' + data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        .error(function(data, status)
        {
            if (status === 401) {
                // Session expired
                $scope.showSessionExpireMessage();
                delete $cookies['crowd.token_key'];
                $scope.loggedIn = null;
            } else {
                $scope.showErrorMessage();
            }
        });

        return true;
    };

    $scope.login = function(username, password)
    {
        $scope.hideLoginDialog();
        password = encodeURIComponent(password);
        $http.post(backendBase + '/v1/session', 'username=' + username + '&password=' + password,
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        .success(function(data)
        {
            $cookies['crowd.token_key'] = data['token'];
            $scope.requestUser();
        })
        .error(function(data, status)
        {
            if (status === 403) {
                $scope.errorMessage = 'Access denied: you are not an ACM member.';
            }
            else {
                $scope.errorMessage = 'Your login failed. Please try again.';
            }
        });
    };

    $scope.logout = function()
    {
        $http.delete(backendBase + '/v1/session/' + $cookies['crowd.token_key'])
        .success(function(data)
        {
            delete $cookies['crowd.token_key'];
            $scope.loggedIn = null;
        });
    };

    $scope.requestUser = function()
    {
        if (!$cookies['crowd.token_key'])
        {
            // Ensure the key is actually gone
            delete $cookies['crowd.token_key'];
            $scope.loggedIn = null;
            return;
        }

        $http.get(backendBase + '/v1/session/' + $cookies['crowd.token_key'])
        .success(function(data)
        {
            $scope.loggedIn = data.user;
        })
        .error(function(data, status)
        {
            if (status === 400) {
                // Session expired
                $scope.showSessionExpireMessage();
                delete $cookies['crowd.token_key'];
                $scope.loggedIn = null;
            }
        });
    };

    $scope.searchAlbum = function(album)
    {
        if (album)
        {
            $scope.searchSongs('album:' + album);
        }
    }

    $scope.searchSongs = function(query)
    {
        if (!query) {
            $scope.randomSongs();
            return;
        }
        $http.get(backendBase + '/v1/songs/search',
        {
            params: { 'q': query }
        })
        .success(function(data)
        {
            // album search
            if (query.substring(0,7) == 'artist:')
            {
                var albums = [];
                for (var resultIndex = 0; resultIndex < data.results.length; resultIndex++)
                {
                    var result = data.results[resultIndex];
                    albums[resultIndex] = result;
                }
                $scope.albumlist = albums;
                $scope.layout = 'albumgrid';
                $scope.searchText = query;
            }
            else
            {
                var songs = [];
                for (var resultIndex = 0; resultIndex < data.results.length; resultIndex++)
                {
                    var result = data.results[resultIndex];
                    songs[resultIndex] = result;
                }
                $scope.playlist = songs;
                $scope.layout = 'songlist';
                $scope.searchText = query;
            }
        });
    }

    $scope.randomSongs = function()
    {
        $http.get(backendBase + '/v1/songs/random')
        .success(function(data)
        {
            var songs = [];
            for (var resultIndex = 0; resultIndex < data.results.length; resultIndex++)
            {
                var result = data.results[resultIndex];
                songs[resultIndex] = result;
            }
            $scope.playlist = songs;
            $scope.layout = 'songlist';
            $scope.searchText = '';
        });
    }

    $scope.voteSong = function(song)
    {
        if (!$scope.isSongVotable(song))
        {
            return;
        }

        if (song.url) {
            var url = encodeURIComponent(song.url);
            if ($scope.userRequest('/v1/queue/add', 'url=' + url)) {
                // Show the UI that the song was voted for
                song.vote = true;
            }
        } else {
            if ($scope.userRequest('/v1/queue/add', 'id=' + song.id)) {
                // Show the UI that the song was voted for
                song.vote = true;
            }
        }
    };

    $scope.getEqualizerInfo = function()
    {
        $http.get(backendBase + '/v1/player/equalizer')
        .success(function(data)
        {
            // Check for equalizer support
            $scope.eqSupported = data['equalizer_supported'];
            if ($scope.eqSupported)
            {
                // Populate preset choices in preset menu
                var presNames = data['equalizer_preset_names'];
                for (var presIndex = 0; presIndex < presNames.length; presIndex++)
                {
                    $scope.eqPresets.push({
                        value: presIndex,
                        displayName: presNames[presIndex]
                    });
                }
                // Add equalizer band controls
                var freqs = data['equalizer_band_freqs'];
                for (var bandIndex = 0; bandIndex < freqs.length; bandIndex++)
                {
                    // Dynamically initialize scope variables for the band control
                    var holdName = 'holdEqBand' + bandIndex + 'Update';
                    if ($scope[holdName] === undefined)
                    {
                        $scope[holdName] = false;
                        $scope['bandLevel' + bandIndex] = 0.0;
                    }
                    // Add the frequency along with its corresponding band index
                    $scope.eqBandFrequencies.push({
                        freq: freqs[bandIndex],
                        index: bandIndex
                    });
                }
            }
        });
    };

    $scope.enableEqualizer = function(enable)
    {
        $scope.eqEnabled = enable;
        $scope.userRequest('/v1/player/equalizer/enable', 'enabled=' + enable);
    }

    $scope.adjustEqualizerPreset = function(index)
    {
        if ($scope.eqPresets.length > Math.floor(index))
        {
            $scope.eqPresetIndex = Math.floor(index);
            $scope.userRequest('/v1/player/equalizer/adjust_preset', 'index=' + $scope.eqPresetIndex);
        }
    };

    $scope.adjustEqualizerPreamp = function(level)
    {
        $scope.eqPreampLevel = roundDbValue(level); // Because of the bar control, this may have non-zero digits after the tenth
        $scope.userRequest('/v1/player/equalizer/adjust_preamp', 'level=' + $scope.eqPreampLevel);
    };

    $scope.adjustEqualizerBand = function(level, band)
    {
        $scope['bandLevel' + band] = roundDbValue(level); // Because of the bar control, this may have non-zero digits after the tenth
        $scope.userRequest('/v1/player/equalizer/adjust_band', 'band=' + band + '&level=' + $scope['bandLevel' + band]);
    };

    $scope.playStream = function(url)
    {
        $scope.hideStreamDialog();
        if (!$scope.ensureLogin()) {
            return;
        }

        $scope.userRequest('/v1/queue/add', 'url=' + encodeURIComponent(url));

    };

    $scope.pauseSong = function()
    {
        $scope.userRequest('/v1/player/pause');
    };

    $scope.skipSong = function()
    {
        $scope.userRequest('/v1/player/play_next');
    };

    $scope.setVolume = function(volume)
    {
        $scope.volume = Math.round(volume); // Because of the bar control, this may be a fraction
        $scope.userRequest('/v1/player/volume', 'volume=' + $scope.volume);
    };
    $scope.updateEqLabels = function(index)
    {
        $scope.$broadcast('changeDbText', {
            index: index
        });
    };
    $scope.refreshPlayer = function()
    {
        $http.get(backendBase + '/v1/now_playing')
        .success(function(data)
        {
            if (data['media']) {
                // Convert to seconds
                $scope.playbackTime = data['player_status']['current_time'] / 1000;
                $scope.playbackDuration = data['media']['length'];
            }
            else {
                $scope.playbackTime = 0;
                $scope.playbackDuration = 0;
            }
            // Prevent setting the volume while the user is changing it
            if (!$scope.holdVolumeUpdate)
            {
                $scope.volume = data['player_status']['volume'];
            }
            // Check for equalizer support
            if (data['player_status']['equalizer_enabled'] !== undefined)
            {
                // Prevent enabling/disabling the equalizer while the user is changing it
                if (!$scope.holdEqEnabledUpdate)
                {
                    $scope.eqEnabled = data['player_status']['equalizer_enabled'];
                }
                // Prevent changing the equalizer preset while the user is changing it
                if (!$scope.holdEqPresetUpdate)
                {
                    $scope.eqPresetIndex = data['player_status']['equalizer_preset'];
                }
                // Prevent changing the preamp while the user is changing it
                if (!$scope.holdEqPreampUpdate)
                {
                    $scope.eqPreampLevel = data['player_status']['equalizer_preamp_level'];
                }
                levels = data['player_status']['equalizer_band_levels'];
                for (var bandIdx = 0; bandIdx < levels.length; bandIdx++)
                {
                    var holdName = 'holdEqBand' + bandIdx + 'Update';
                    var hold = $scope[holdName];
                    if ($scope[holdName] === undefined)
                    {
                        $scope[holdName] = false;
                    }
                    // Prevent changing the band while the user is changing it
                    if (!$scope[holdName])
                    {
                        $scope['bandLevel' + bandIdx] = levels[bandIdx];
                    }
                }
                $scope.updateEqLabels(-2);
            }
            $scope.isPlaying = data['player_status']['state'] == 'State.Playing';
        });

        var params = {};
        if ($scope.loggedIn)
        {
            params['user'] = $scope.loggedIn['name'];
        }
        $http.get(backendBase + '/v1/queue',
        {
            params: params
        })
        .success(function(data)
        {
            $scope.queue = data['queue'].slice(data['position']);
        });
    };

    //
    // Intervals
    //

    // Frequency, check the the status of the player and queue
    $interval($scope.refreshPlayer, 1000);

    // Every minute, check that the session has not expired
    $interval(function()
    {
        $scope.requestUser();
    }, 60 * 1000);

    //
    // Initial Setup
    //

    $scope.requestUser();
    $scope.randomSongs();
    $scope.getEqualizerInfo();
    $scope.refreshPlayer();
}]);

// Print banner
if (window.console) {
    console.log(document.childNodes[1].nodeValue);
}
