import gql from 'graphql-tag';
export const NotificationFragment = gql`
    fragment NotificationFragment on Notification {
        id
        owner
        createdAt
        updatedAt
        message
        read
        source
        sourceId
    }
`;
