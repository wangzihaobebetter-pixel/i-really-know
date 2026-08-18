*allNodes = (char **)malloc(count * sizeof(char));
while (i < count)
{
    (*allNodes)[i] = (char *)malloc(sizeof(char) * 31);
    if ((*allNodes)[i] == NULL)
        printf("ERROR OUT OF MEMORY\n");
    strcpy((*allNodes)[i], "");
