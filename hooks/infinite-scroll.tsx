/*
Intersection Observer is a browser API that lets you detect 
when an element enters or exits the viewport (or another parent element). 
In React, you use it to trigger something when the user scrolls to a certain element.


*/

import {useEffect, useRef, useCallback} from 'react';

//custom hoook to handle intersection Observer logic
//use is common to start hook function names
//a function to call when more data is needed, a boolean for whether more data exists, and a boolean for whether a fetch is already in progress

export const useInfiniteScroll = (fetchData: () => void, hasMore: boolean, isLoading: boolean) => {
    const loadMoreRef = useRef<HTMLDivElement | null>(null); //

    const handleIntersection = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            if (entries[0].isIntersecting && hasMore && !isLoading) {
                fetchData();
            }
        },
        [fetchData, hasMore, isLoading] //load the current state of these functions into the function

    );

    useEffect(() => {
        const observer = new IntersectionObserver(handleIntersection);
        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [handleIntersection]); //function being passed in
    return {loadMoreRef};
};
    